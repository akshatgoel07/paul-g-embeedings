import { getConfig } from "@pg/core";
import type { RetrievedChunk } from "@pg/shared";

/**
 * Order and trim retrieved chunks for the generation context. Today: score sort
 * + trim to RERANK_TOP_N. This is the seam for a cross-encoder or LLM reranker —
 * swap the body here and the chat flow is unaffected.
 */
export function rerank(_query: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
  const topN = getConfig().RERANK_TOP_N;
  return [...chunks].sort((a, b) => b.score - a.score).slice(0, topN);
}
