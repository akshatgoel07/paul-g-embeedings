import { z } from "zod";

/**
 * Single, validated view of the environment. Every package reads config from
 * here so a missing/invalid var fails fast at startup instead of at first use.
 */
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional().default(""),
  QDRANT_COLLECTION: z.string().default("pg_essays"),
  REDIS_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  EMBEDDING_DIM: z.coerce.number().int().positive().default(768),
  GENERATION_MODEL: z.string().default("gemini-2.5-flash"),
  PG_RSS_URL: z
    .string()
    .url()
    .default("http://www.aaronsw.com/2002/feeds/pgessays.rss"),
  CHUNK_TOKENS: z.coerce.number().int().positive().default(800),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(120),
  INGEST_LIMIT: z.coerce.number().int().positive().optional(), // cap essays per run (test/dev)
  RETRIEVE_TOP_K: z.coerce.number().int().positive().default(8),
  RERANK_TOP_N: z.coerce.number().int().positive().default(4),
  SEMANTIC_CACHE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.95),
  API_PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Config = z.infer<typeof EnvSchema>;

let cached: Config | undefined;

export function getConfig(): Config {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("✗ Invalid environment configuration:");
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    throw new Error("Invalid environment configuration");
  }
  cached = parsed.data;
  return cached;
}
