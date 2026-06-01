"""Synthesize a persona fine-tuning dataset from the essays in Postgres.

For each essay, ask Gemini to write grounded Q/A pairs in Paul Graham's voice,
and write them as JSONL ready to adapt to your tuning backend's format.
"""

import json

import psycopg
from google import genai

from .config import (
    DATA_DIR,
    DATABASE_URL,
    GEMINI_API_KEY,
    GENERATION_MODEL,
    require,
)

PAIRS_PER_ESSAY = 2
MAX_BODY_CHARS = 8000
OUT = DATA_DIR / "persona.jsonl"

GEN_PROMPT = """From the essay below, write {n} question/answer pairs.
Questions should be ones a curious reader would actually ask.
Answers must be in Paul Graham's first-person voice and grounded ONLY in this essay.
Return ONLY a JSON array: [{{"question": "...", "answer": "..."}}].

Title: {title}
Essay:
{body}"""


def _strip_fences(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[-1]
        s = s.removeprefix("json").strip()
        s = s.rsplit("```", 1)[0].strip()
    return s


def main() -> None:
    require("GEMINI_API_KEY", GEMINI_API_KEY)
    require("DATABASE_URL", DATABASE_URL)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    gc = genai.Client(api_key=GEMINI_API_KEY)

    written = 0
    with (
        psycopg.connect(DATABASE_URL) as conn,
        conn.cursor() as cur,
        OUT.open("w") as f,
    ):
        cur.execute(
            'SELECT title, "cleanContent" FROM "Essay" '
            'WHERE "cleanContent" IS NOT NULL'
        )
        for title, body in cur.fetchall():
            prompt = GEN_PROMPT.format(
                n=PAIRS_PER_ESSAY, title=title, body=body[:MAX_BODY_CHARS]
            )
            resp = gc.models.generate_content(model=GENERATION_MODEL, contents=prompt)
            try:
                pairs = json.loads(_strip_fences(resp.text or "[]"))
            except json.JSONDecodeError:
                print(f"  ! skipped {title} (unparseable response)")
                continue

            for p in pairs:
                record = {
                    "systemInstruction": "You are Paul Graham. Answer in his voice.",
                    "contents": [
                        {"role": "user", "parts": [{"text": p["question"]}]},
                        {"role": "model", "parts": [{"text": p["answer"]}]},
                    ],
                }
                f.write(json.dumps(record) + "\n")
                written += 1
            print(f"✓ {title} (+{len(pairs)})")

    print(f"\nWrote {written} examples to {OUT}")


if __name__ == "__main__":
    main()
