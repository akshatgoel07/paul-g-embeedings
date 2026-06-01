"""Persona fine-tuning entrypoint (Gemini supervised tuning).

By default this validates the dataset and prints the plan. Pass --run to submit
the job. Confirm the exact tuning API + dataset format for your project first
(it differs between AI Studio keys and Vertex) — see ml/README.md.
"""

import argparse

from .config import DATA_DIR, GEMINI_API_KEY, require

DATASET = DATA_DIR / "persona.jsonl"
BASE_MODEL = "gemini-2.5-flash"


def main() -> None:
    ap = argparse.ArgumentParser(description="Fine-tune the Paul Graham persona")
    ap.add_argument("--run", action="store_true", help="actually create the tuning job")
    args = ap.parse_args()

    if not DATASET.exists():
        raise SystemExit(f"Dataset not found: {DATASET}\nRun pg-build-dataset first.")

    count = sum(1 for _ in DATASET.open())
    print(f"Dataset:    {DATASET} ({count} examples)")
    print(f"Base model: {BASE_MODEL}")

    if not args.run:
        print("\nDry run — re-run with --run to start tuning.")
        print("Ensure tuning is enabled for your project and you have quota.")
        return

    require("GEMINI_API_KEY", GEMINI_API_KEY)
    from google import genai  # noqa: F401

    # genai.Client(api_key=GEMINI_API_KEY).tunings.tune(
    #     base_model=BASE_MODEL,
    #     training_dataset=...,   # adapt persona.jsonl to your backend's schema
    #     config=...,
    # )
    raise SystemExit(
        "Wire up client.tunings.tune(...) for your project — see ml/README.md"
    )


if __name__ == "__main__":
    main()
