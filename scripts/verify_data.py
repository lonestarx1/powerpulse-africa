#!/usr/bin/env python3
"""Assert that the committed data matches the numbers we publish.

    python3 scripts/verify_data.py

Every figure in the README and the 1-pager -- 502 rows, 3,201 records, zero
dropped -- is checked against data/ here. A judge should not have to take the
prose on trust, and neither should we: if someone re-runs the scraper and the
counts move, this fails loudly instead of leaving stale numbers in the pitch.

Exits non-zero on the first mismatch.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# What the README, the 1-pager and the video say.
CLAIMS = {
    "pages_crawled": 126,
    "raw_rows": 502,
    "records": 3201,
    "districts": 34,
    "district_sector_pairs": 1047,
    "dropped_rows": 0,
    "flagged_rows": 55,
}


def main() -> int:
    raw = json.loads((ROOT / "data" / "outages_raw.json").read_text())
    parsed = json.loads((ROOT / "data" / "outages.json").read_text())
    failures = json.loads((ROOT / "data" / "parse_failures.json").read_text())
    records = parsed["records"]

    actual = {
        "pages_crawled": raw["page_count"],
        "raw_rows": len(raw["records"]),
        "records": len(records),
        "districts": len({r["district"] for r in records}),
        "district_sector_pairs": len(
            {(r["district"], r["sector"]) for r in records if r["sector"] != "*"}
        ),
        "dropped_rows": failures["dropped"],
        "flagged_rows": failures["flagged"],
    }

    problems = [
        f"  {key}: claimed {CLAIMS[key]}, actual {value}"
        for key, value in actual.items()
        if CLAIMS[key] != value
    ]

    # Invariants that must hold whatever the counts are.
    if any(r["end_time"] and r["duration_minutes"] is None for r in records):
        problems.append("  a record has an end time but no duration")
    if any(r["duration_minutes"] is not None and not r["end_time"] for r in records):
        problems.append("  a record has a duration but no published end time")
    if any(r["sector"] != "*" and not r["sector"].strip() for r in records):
        problems.append("  a record has an empty sector")

    for key, value in actual.items():
        print(f"{key:24} {value}")

    if problems:
        print("\nMISMATCH -- update the docs or re-run the pipeline:")
        print("\n".join(problems))
        return 1

    print("\nall published figures match the committed data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
