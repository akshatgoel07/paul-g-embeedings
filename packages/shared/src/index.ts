import { z } from "zod";

/**
 * Contracts shared across the API, web client and ingestion pipeline.
 * One source of truth for the wire format keeps BE and FE in lockstep.
 */

// --- Retrieval ---------------------------------------------------------------

export const RetrievedChunkSchema = z.object({
  chunkId: z.string(),
  essayId: z.number().int(),
  title: z.string(),
  link: z.string().url(),
  text: z.string(),
  score: z.number(),
});
export type RetrievedChunk = z.infer<typeof RetrievedChunkSchema>;

// --- Citations (what the UI renders under an answer) -------------------------

export const CitationSchema = z.object({
  essayId: z.number().int(),
  title: z.string(),
  link: z.string().url(),
  chunkId: z.string(),
  score: z.number(),
});
export type Citation = z.infer<typeof CitationSchema>;

// --- Chat request ------------------------------------------------------------

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// --- Streamed chat events (SSE) ---------------------------------------------

export const ChatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("citations"), citations: z.array(CitationSchema) }),
  z.object({ type: z.literal("token"), value: z.string() }),
  z.object({ type: z.literal("cache"), hit: z.enum(["semantic", "response", "miss"]) }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type ChatEvent = z.infer<typeof ChatEventSchema>;
