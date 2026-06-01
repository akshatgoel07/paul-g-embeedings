"""LLM-as-judge evaluation of the running RAG API.

Asks the API a fixed set of questions, then has Gemini grade each answer on
faithfulness, voice and usefulness. Requires the stack to be running (make dev).
"""

import asyncio
import json
import statistics

import httpx
from google import genai

from .config import API_URL, GEMINI_API_KEY, GENERATION_MODEL, require

EVAL_QUESTIONS = [
    "How do I get startup ideas?",
    "What does it mean to do things that don't scale?",
    "What makes someone a great founder?",
    "What's the difference between a maker's schedule and a manager's schedule?",
    "Why is it important to write well?",
]

JUDGE_PROMPT = """You are grading an answer meant to sound like Paul Graham and stay grounded in his essays.

Question: {q}
Answer: {a}
Cited essays: {cites}

Score each dimension as an integer 1-5:
- faithfulness: grounded in the cited essays, no fabrication
- voice: sounds like Paul Graham
- usefulness: actually answers the question

Return ONLY JSON: {{"faithfulness": n, "voice": n, "usefulness": n, "notes": "..."}}"""


def _strip_fences(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[-1]
        s = s.removeprefix("json").strip()
        s = s.rsplit("```", 1)[0].strip()
    return s


async def fetch_answer(client: httpx.AsyncClient, question: str) -> tuple[str, list[str]]:
    answer, cites = "", []
    async with client.stream("POST", f"{API_URL}/chat", json={"message": question}) as r:
        async for line in r.aiter_lines():
            if not line.startswith("data:"):
                continue
            ev = json.loads(line[5:].strip())
            if ev.get("type") == "token":
                answer += ev["value"]
            elif ev.get("type") == "citations":
                cites = [c["title"] for c in ev["citations"]]
    return answer, cites


def judge(gc: genai.Client, q: str, a: str, cites: list[str]) -> dict:
    resp = gc.models.generate_content(
        model=GENERATION_MODEL,
        contents=JUDGE_PROMPT.format(q=q, a=a, cites=", ".join(cites) or "(none)"),
    )
    return json.loads(_strip_fences(resp.text or "{}"))


async def run() -> None:
    require("GEMINI_API_KEY", GEMINI_API_KEY)
    gc = genai.Client(api_key=GEMINI_API_KEY)
    scores: dict[str, list[int]] = {"faithfulness": [], "voice": [], "usefulness": []}

    async with httpx.AsyncClient(timeout=120) as client:
        for q in EVAL_QUESTIONS:
            answer, cites = await fetch_answer(client, q)
            s = judge(gc, q, answer, cites)
            for k in scores:
                scores[k].append(int(s.get(k, 0)))
            print(f"• {q}")
            print(
                f"    faithfulness={s.get('faithfulness')} "
                f"voice={s.get('voice')} usefulness={s.get('usefulness')} "
                f"— {s.get('notes', '')}"
            )

    print("\n── averages ──")
    for k, vals in scores.items():
        print(f"  {k:12} {statistics.mean(vals):.2f}")


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
