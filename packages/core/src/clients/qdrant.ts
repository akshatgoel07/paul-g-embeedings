import { QdrantClient } from "@qdrant/js-client-rest";
import { getConfig } from "../config.ts";

let client: QdrantClient | undefined;

export function qdrant(): QdrantClient {
  if (!client) {
    const cfg = getConfig();
    client = new QdrantClient({
      url: cfg.QDRANT_URL,
      apiKey: cfg.QDRANT_API_KEY || undefined,
      // local server may trail the npm client by a few minor versions
      checkCompatibility: false,
    });
  }
  return client;
}

export interface ChunkPayload {
  // index signature so the object satisfies Qdrant's Record<string, unknown> payload
  [key: string]: unknown;
  chunkId: string;
  essayId: number;
  title: string;
  link: string;
  text: string;
  index: number;
}

async function ensure(name: string, size: number): Promise<void> {
  const { exists } = await qdrant().collectionExists(name);
  if (!exists) {
    await qdrant().createCollection(name, {
      vectors: { size, distance: "Cosine" },
    });
  }
}

/** Create the essays collection if missing. Idempotent. */
export async function ensureCollection(): Promise<void> {
  const cfg = getConfig();
  await ensure(cfg.QDRANT_COLLECTION, cfg.EMBEDDING_DIM);
}

export async function upsertChunks(
  points: { id: string; vector: number[]; payload: ChunkPayload }[],
): Promise<void> {
  if (points.length === 0) return;
  await qdrant().upsert(getConfig().QDRANT_COLLECTION, { wait: true, points });
}

/** Remove all points for an essay — keeps re-ingestion idempotent. */
export async function deleteEssayPoints(essayId: number): Promise<void> {
  await qdrant().delete(getConfig().QDRANT_COLLECTION, {
    wait: true,
    filter: { must: [{ key: "essayId", match: { value: essayId } }] },
  });
}

export interface ScoredChunk {
  score: number;
  payload: ChunkPayload;
}

export async function searchChunks(
  vector: number[],
  topK: number,
): Promise<ScoredChunk[]> {
  const res = await qdrant().search(getConfig().QDRANT_COLLECTION, {
    vector,
    limit: topK,
    with_payload: true,
  });
  return res.map((r) => ({
    score: r.score,
    payload: r.payload as unknown as ChunkPayload,
  }));
}
