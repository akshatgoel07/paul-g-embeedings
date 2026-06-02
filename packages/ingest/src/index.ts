import { prisma } from "@pg/db";
import {
  deleteEssayPoints,
  ensureCollection,
  ensureSemanticCache,
  getConfig,
  sha256,
  upsertChunks,
} from "@pg/core";
import { fetchEssays, fetchHtml } from "./rss.ts";
import { cleanHtmlContent } from "./contentCleaner.ts";
import { chunkText } from "./chunk.ts";
import { embedWithCache } from "./embed.ts";

async function main(): Promise<void> {
  const cfg = getConfig();

  console.log("→ Ensuring Qdrant collections…");
  await ensureCollection();
  await ensureSemanticCache();

  console.log(`→ Fetching RSS: ${cfg.PG_RSS_URL}`);
  const all = await fetchEssays(cfg.PG_RSS_URL);
  const essays = cfg.INGEST_LIMIT ? all.slice(0, cfg.INGEST_LIMIT) : all;
  console.log(
    `→ Found ${all.length} essays` +
      (cfg.INGEST_LIMIT ? `, ingesting first ${essays.length}\n` : "\n"),
  );

  let totalChunks = 0;
  for (const [i, e] of essays.entries()) {
    const prefix = `[${i + 1}/${essays.length}] ${e.title}`;
    try {
      const html = await fetchHtml(e.link);
      const clean = cleanHtmlContent(html);

      const essay = await prisma.essay.upsert({
        where: { link: e.link },
        create: {
          title: e.title,
          description: e.description,
          link: e.link,
          content: html,
          cleanContent: clean,
        },
        update: {
          title: e.title,
          description: e.description,
          content: html,
          cleanContent: clean,
        },
      });

      const chunks = chunkText(clean);
      if (chunks.length === 0) {
        console.warn(`${prefix} — no chunks, skipping`);
        continue;
      }

      const vectors = await embedWithCache(chunks.map((c) => c.text));

      // Idempotent re-ingest: clear prior chunks in both stores first.
      await deleteEssayPoints(essay.id);
      await prisma.chunk.deleteMany({ where: { essayId: essay.id } });

      const created = await prisma.$transaction(
        chunks.map((c) =>
          prisma.chunk.create({
            data: {
              essayId: essay.id,
              index: c.index,
              text: c.text,
              tokens: c.tokens,
              contentHash: sha256(c.text),
            },
          }),
        ),
      );

      await upsertChunks(
        created.map((c, k) => ({
          id: c.id,
          vector: vectors[k]!,
          payload: {
            chunkId: c.id,
            essayId: essay.id,
            title: essay.title,
            link: essay.link,
            text: c.text,
            index: c.index,
          },
        })),
      );

      await prisma.essay.update({
        where: { id: essay.id },
        data: { embeddedAt: new Date() },
      });

      totalChunks += chunks.length;
      console.log(`${prefix} — ${chunks.length} chunks ✓`);
    } catch (err) {
      console.error(`${prefix} — failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n✓ Ingestion complete — ${totalChunks} chunks across ${essays.length} essays`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
