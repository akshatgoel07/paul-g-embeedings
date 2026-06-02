import { ChatEventSchema, type ChatEvent } from "@pg/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/**
 * POST a question and yield parsed SSE events. EventSource only does GET, so we
 * read the POST response body stream and parse `data:` frames ourselves.
 */
export async function* streamChat(
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }
  if (!res.body) {
    throw new Error("API returned no response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLine = frame
        .split("\n")
        .find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json) continue;
      const parsed = ChatEventSchema.safeParse(JSON.parse(json));
      if (parsed.success) yield parsed.data;
    }
  }
}
