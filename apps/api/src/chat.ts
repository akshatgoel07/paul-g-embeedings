import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
  embedQuery,
  generateStream,
  getCachedResponse,
  getConfig,
  getSemanticAnswer,
  searchChunks,
  setCachedResponse,
  setSemanticAnswer,
  sha256,
} from "@pg/core";
import {
  ChatRequestSchema,
  type ChatEvent,
  type Citation,
  type RetrievedChunk,
} from "@pg/shared";
import { buildPrompt, PERSONA_SYSTEM } from "./persona.ts";
import { rerank } from "./rerank.ts";

export const chatRoute = new Hono();

type Send = (event: ChatEvent) => Promise<void>;

/** One citation per essay, in relevance order. */
function citationsOf(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Set<number>();
  const out: Citation[] = [];
  for (const c of chunks) {
    if (seen.has(c.essayId)) continue;
    seen.add(c.essayId);
    out.push({
      essayId: c.essayId,
      title: c.title,
      link: c.link,
      chunkId: c.chunkId,
      score: c.score,
    });
  }
  return out;
}

/** The full chat flow, transport-agnostic: emits ChatEvents via `send`. */
async function streamAnswer(message: string, send: Send): Promise<void> {
  const cfg = getConfig();
  try {
    const vector = await embedQuery(message);

    // 1) Semantic cache — answer a near-identical prior question for free.
    const sem = await getSemanticAnswer(vector);
    if (sem) {
      await send({ type: "cache", hit: "semantic" });
      await send({ type: "citations", citations: sem.citations });
      await send({ type: "token", value: sem.answer });
      await send({ type: "done" });
      return;
    }

    // 2) Retrieve + rerank.
    const hits = await searchChunks(vector, cfg.RETRIEVE_TOP_K);
    const chunks: RetrievedChunk[] = hits.map((h) => ({
      chunkId: h.payload.chunkId,
      essayId: h.payload.essayId,
      title: h.payload.title,
      link: h.payload.link,
      text: h.payload.text,
      score: h.score,
    }));
    const top = rerank(message, chunks);
    const citations = citationsOf(top);
    await send({ type: "citations", citations });

    const prompt = buildPrompt(message, top);
    const promptHash = sha256(`${PERSONA_SYSTEM}\n${prompt}`);

    // 3) Exact response cache.
    const cached = await getCachedResponse(promptHash);
    if (cached) {
      await send({ type: "cache", hit: "response" });
      await send({ type: "token", value: cached });
      await send({ type: "done" });
      await setSemanticAnswer(message, vector, cached, citations);
      return;
    }

    // 4) Generate, streaming deltas to the client.
    await send({ type: "cache", hit: "miss" });
    let full = "";
    for await (const delta of generateStream({ system: PERSONA_SYSTEM, prompt })) {
      full += delta;
      await send({ type: "token", value: delta });
    }
    await send({ type: "done" });

    // 5) Populate caches for next time.
    if (full.trim()) {
      await setCachedResponse(promptHash, full);
      await setSemanticAnswer(message, vector, full, citations);
    }
  } catch (err) {
    await send({
      type: "error",
      message: err instanceof Error ? err.message : "unknown error",
    });
  }
}

// POST /chat — body: { message }. Used by apps/web.
chatRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  }
  return streamSSE(c, (stream) =>
    streamAnswer(parsed.data.message, (e) =>
      stream.writeSSE({ data: JSON.stringify(e) }),
    ),
  );
});

// GET /chat?q=... — for EventSource / GET-only clients. Also accepts ?message=/?prompt=.
chatRoute.get("/", (c) => {
  const message = (
    c.req.query("q") ??
    c.req.query("message") ??
    c.req.query("prompt") ??
    ""
  ).trim();
  if (!message) {
    return c.json(
      { error: "Provide a question via ?q=... (GET) or a JSON body { message } (POST)" },
      400,
    );
  }
  return streamSSE(c, (stream) =>
    streamAnswer(message, (e) => stream.writeSSE({ data: JSON.stringify(e) })),
  );
});
