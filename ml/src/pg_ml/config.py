"""Shared config — loads the monorepo root .env so Python sees the same vars."""

import os
from pathlib import Path

from dotenv import load_dotenv

# ml/src/pg_ml/config.py -> repo root is 3 parents up.
ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
API_URL = os.environ.get("VITE_API_URL", "http://localhost:3001")
GENERATION_MODEL = os.environ.get("GENERATION_MODEL", "gemini-2.5-flash")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "gemini-embedding-001")

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def require(name: str, value: str) -> str:
    if not value:
        raise SystemExit(f"Missing required env var: {name} (set it in the root .env)")
    return value
