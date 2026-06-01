# paul-g-embeddings

A Retrieval-Augmented Generation (RAG) system that builds a **Paul Graham persona** — ask
questions and get answers grounded in his actual essays, in his voice, with citations.

TypeScript monorepo. Vectors in **Qdrant** (runs locally), relational data in **Postgres**,
caching in **Redis**, embeddings + generation via **Google Gemini**. A separate **Python**
workspace handles evaluation and persona fine-tuning.

---

## Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │                  apps/web                     │
                          │            Vite + React chat UI               │
                          └───────────────────────┬──────────────────────┘
                                                  │ SSE (stream)
                          ┌───────────────────────▼──────────────────────┐
                          │                  apps/api  (Hono)             │
                          │  /chat  → cache → retrieve → rerank → generate│
                          └───┬───────────┬──────────────┬───────────┬────┘
                              │           │              │           │
                    ┌─────────▼──┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌──▼────────┐
                    │   Redis    │  │  Qdrant   │  │ Postgres  │  │  Gemini   │
                    │  (caches)  │  │ (vectors) │  │(essays/   │  │ embed +   │
                    │            │  │           │  │ metadata) │  │ generate  │
                    └────────────┘  └─────▲─────┘  └─────▲─────┘  └──▲────────┘
                                          │              │           │
                          ┌───────────────┴──────────────┴───────────┘
                          │            packages/ingest                 (offline)
                          │   RSS → clean → chunk → embed → upsert      │
                          └────────────────────────────────────────────┘
```

### Why this stack
- **TypeScript everywhere** (BE + FE) → shared types via `packages/shared`, one toolchain.
- **Qdrant** for vectors — purpose-built ANN, runs locally in one container, scales out later.
- **Postgres** for essays + chunk metadata (Prisma). The `pgvector/pgvector` image is used so
  you can also store vectors in Postgres if you ever want a single-store setup.
- **Redis** backs every cache tier. The hot path lives in C/Rust (Redis, Qdrant) — your TS code
  just orchestrates.
- **Gemini** `gemini-embedding-001` @ **768 dims** (Google's recommended sweet spot) for
  embeddings; `gemini-2.5-flash` for generation.
- **Python** (`ml/`) only where its ecosystem wins: RAG evals and persona fine-tuning.

### Cache tiers (`packages/core/cache`)
| Tier | Key → Value | Store | Win |
|---|---|---|---|
| Embedding cache | `hash(text)` → vector | Redis | skip re-embedding |
| Semantic answer cache | query vector ~≈ prior query → answer | Qdrant | biggest latency/cost win |
| Retrieval cache | `hash(query)` → chunk ids | Redis | skip ANN search |
| Response cache | `hash(prompt)` → answer | Redis | free exact repeats |

---

## Monorepo layout

```
apps/
  api/         Hono server — retrieval, generation, cache orchestration, SSE
  web/         Vite + React chat UI
packages/
  core/        Gemini / Qdrant / Redis clients, cache tiers, env config
  ingest/      RSS → clean → chunk → embed → upsert pipeline
  db/          Prisma schema + client (Postgres)
  shared/      zod schemas / types shared across BE + FE
ml/            Python — evaluation + persona fine-tuning
```

---

## Quickstart

Prereqs: Docker, Node ≥ 20, pnpm ≥ 10. (Python ≥ 3.11 only for `ml/`.)

```bash
cp .env.example .env        # fill in GEMINI_API_KEY
make dev                    # one command: infra up + db migrate + apps in dev
```

`make dev` brings up Postgres, Qdrant and Redis in Docker, runs DB migrations, then starts
the API and web apps. Then ingest the essays:

```bash
make ingest                 # fetch → clean → chunk → embed → Qdrant
```

| Service | URL |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:3001 |
| Qdrant dashboard | http://localhost:6333/dashboard |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

### Make targets
```
make up        start infra containers (postgres, qdrant, redis)
make down      stop infra containers
make dev       up + migrate + run apps (the one command)
make ingest    run the ingestion pipeline
make migrate   apply Prisma migrations
make logs      tail infra logs
make clean     stop containers and remove volumes
make ml-setup  create the Python venv for ml/
```

---

## Environment

All variables live in `.env` (see `.env.example`). Validated at startup by
`packages/core/src/config.ts` — the apps refuse to boot with a missing/invalid var.

---

## Build phases

- [x] **Phase 1 — Foundation:** monorepo, Docker infra, env, one-command start, README.
- [x] **Phase 2 — DB + shared:** Prisma schema (Essays, Chunk metadata), zod contracts.
- [x] **Phase 3 — Core + ingest:** clients + cache tiers; RSS→clean→chunk→embed→Qdrant.
- [x] **Phase 4 — API:** Hono `/chat` (SSE) with cache → retrieve → rerank → generate.
- [ ] **Phase 5 — Web:** React chat UI with streaming + citations.
- [ ] **Phase 6 — ML:** Python eval harness + persona fine-tuning.

---

## License

ISC
