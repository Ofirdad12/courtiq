"""Unified CourtIQ ingestion CLI for Israeli women's basketball and EuroCup Women."""

import argparse
import json
from pathlib import Path

from .adapters.israel_women import ingest_israel_women
from .adapters.fiba_women import ingest_fiba_women

def main():
    parser = argparse.ArgumentParser(description="CourtIQ multi-source basketball ingestion")
    parser.add_argument("--source", required=True, choices=["israel-women", "fiba-women"])
    parser.add_argument("--input", required=True, help="Official CSV/JSON boxscore export")
    parser.add_argument("--competition", default=None)
    parser.add_argument("--season", default=None)
    parser.add_argument("--game-id", default=None)
    parser.add_argument("--date", default=None)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    kwargs = {
        "season": args.season,
        "game_id": args.game_id,
        "date": args.date,
    }
    if args.competition:
        kwargs["competition"] = args.competition

    if args.source == "israel-women":
        result = ingest_israel_women(args.input, **kwargs)
    else:
        result = ingest_fiba_women(args.input, **kwargs)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote verified CourtIQ JSON -> {out}")

if __name__ == "__main__":
    main()
