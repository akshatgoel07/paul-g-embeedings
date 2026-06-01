# ml — evaluation & persona fine-tuning

The Python side of the monorepo. Used only where Python's ecosystem wins:
measuring answer quality and tuning the Paul Graham persona. It reads the same
root `.env` as the TS apps.

## Setup

```bash
make ml-setup          # from repo root: creates ml/.venv and installs the package
# or manually:
cd ml && python3 -m venv .venv && ./.venv/bin/pip install -e ".[dev]"
```

## Commands

| Command | What it does |
|---|---|
| `pg-eval` | LLM-as-judge eval: asks the running API a fixed question set, scores faithfulness / voice / usefulness with Gemini. Requires `make dev` running. |
| `pg-build-dataset` | Reads essays from Postgres and synthesizes persona Q/A pairs → `ml/data/persona.jsonl`. |
| `pg-finetune` | Validates the dataset and prints the tuning plan; `--run` submits the job. |

Run inside the venv, e.g. `./.venv/bin/pg-eval`.

## Notes

- `pg-finetune` ships as a documented entrypoint: confirm the exact supervised
  tuning API and dataset format for your Gemini/Vertex project before wiring up
  the `client.tunings.tune(...)` call (the format differs between AI Studio keys
  and Vertex projects).
- Generated artifacts (`ml/data/`, checkpoints) are gitignored.
