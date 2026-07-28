#!/usr/bin/env python3
"""Explode the scraped REG rows into one record per (outage x affected sector).

Reads : data/outages_raw.json   (from scrape_reg.py)
Writes: data/outages.json       (exploded, normalised)
        data/parse_failures.json (rows we could not fully parse, with a reason)

The source `Sector / Areas` column is free text written by a human, and the
variance is the whole difficulty. Shapes actually present in the 502 rows:

    "Gisozi, Kinyinya & Kacyiru"                        -- plain list, district from the Date row
    "Mwogo, Juru in Bugesera; Masaka in Kicukiro"       -- ';' groups, each with an "in <District>" tail
    "All sectors in Rutsiro"                            -- district-wide wildcard
    "All Sectors of Rutsiro District, Bwishyura ... Sectors of Karongi"
                                                        -- TWO district hints, no ';' separator
    "Some parts of Ruhango, Nyanza and Huye Districts"  -- the "sectors" are actually district names

So we do not split on ';' alone. We walk the chunk list left to right and
flush the buffer every time a chunk carries a district hint ("in X" / "of X
District"). Whatever is left at the end belongs to the row's district if the
row names only one; if it names several we cannot know which, and we say so
(`district_inferred: true`) rather than silently picking one.

Duration is null, never guessed, when REG published no end time -- rows like
"09:00 AM - Now" are live outages with no ETA, and those are precisely the
cases the product must be honest about.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IN = REPO_ROOT / "data" / "outages_raw.json"
DEFAULT_OUT = REPO_ROOT / "data" / "outages.json"
DEFAULT_FAILURES = REPO_ROOT / "data" / "parse_failures.json"

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}

# The 30 districts of Rwanda. The `District Affected` column is hand-typed and
# contains "Bugesera District", "Nyabihu.", "NYarugenge", "Nyrugenge", and one
# "Some parts of Kisoro in Uganda". Canonicalising against this list keeps the
# match index from sprouting near-duplicate districts.
DISTRICTS = [
    "Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara", "Nyaruguru",
    "Huye", "Nyamagabe", "Ruhango", "Muhanga", "Kamonyi", "Karongi", "Rutsiro",
    "Rubavu", "Nyabihu", "Ngororero", "Rusizi", "Nyamasheke", "Rulindo",
    "Gakenke", "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare",
    "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Bugesera",
]
DATE_RE = re.compile(r"^\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s*$")
CLOCK_RE = re.compile(r"^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$", re.I)

# "Kacyiru in Gasabo" / "Gitesi Sectors of Karongi District" / "parts of Ngoma District"
DISTRICT_HINT_RE = re.compile(
    r"\b(?:in|of)\s+([A-Z][A-Za-z'\-]+)(?:\s+District)?\s*$", re.I
)

# noise that wraps a sector list without naming a place
PREFIX_NOISE_RE = re.compile(
    r"^\s*(?:a\s+|the\s+)?(?:very\s+)?(?:small\s+|large\s+|big\s+)?"
    r"(?:some\s+parts?\s+of|all\s+parts?\s+of|parts?\s+of|all\s+the\s+sectors?\s+(?:of|in)|"
    r"all\s+sectors?\s+(?:of|in)|sectors?\s+(?:of|in)|areas?\s+(?:of|in)|"
    r"all\s+sectors?|sectors?|areas?)\s+",
    re.I,
)
SUFFIX_NOISE_RE = re.compile(r"\s*(?:sectors?|districts?|areas?|cells?|villages?)\s*$", re.I)

# "A part of Bibare Cell in Kimironko Sector" -- the SECTOR is the unit we index
SECTOR_HINT_RE = re.compile(r"\b(?:in|of)\s+([A-Z][A-Za-z'\-]+)\s+Sector\b", re.I)

PARENTHETICAL_RE = re.compile(r"\([^)]*\)")

WILDCARD_RE = re.compile(r"\ball\s+(?:the\s+)?(?:sectors?|areas?|parts?)\b", re.I)

# splits a group into candidate place names
CHUNK_SPLIT_RE = re.compile(r"\s*(?:,|;|&|\band\b)\s*", re.I)

FEEDER_RE = re.compile(r"[\"“‘']([^\"”’']{2,40})[\"”’']")

REASON_CATEGORIES = [
    ("vandalism", r"vandal|theft|stolen|sabotage"),
    ("fault", r"fault|breakdown|damag|failure|emergency|trip|storm|lightning|accident|burnt|burn"),
    ("extension", r"extension|expansion|connect|new line|upgrad|reinforc|relocat|construction"),
    ("maintenance", r"maintenance|maintainance|repair|replac|inspect|clearing|works"),
]


def norm(text: str) -> str:
    """Match key: accent-free, lowercase, alphanumeric only."""
    stripped = unicodedata.normalize("NFKD", text or "")
    stripped = "".join(c for c in stripped if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", stripped.lower())


def title(text: str) -> str:
    """Display form. The source mixes 'NYamirambo' and 'Nyamirambo'."""
    text = re.sub(r"\s+", " ", (text or "").strip())
    if text and (text.isupper() or re.search(r"[a-z][A-Z]", text)):
        return text.title()
    return text[:1].upper() + text[1:] if text else text


DISTRICT_BY_KEY = {norm(d): d for d in DISTRICTS}


def canonical_district(raw: str) -> tuple[str, bool]:
    """-> (name, known). Snaps typos onto the 30 official districts."""
    name = clean_chunk(raw)
    name = re.sub(r"\s*district\s*$", "", name, flags=re.I).strip(" .,")
    key = norm(name)
    if key in DISTRICT_BY_KEY:
        return DISTRICT_BY_KEY[key], True
    # 0.9 is deliberately tight: 'Nyrugenge'->'Nyarugenge' (0.95) must snap,
    # but 'Kimonyi' (a Musanze sector) must NOT be pulled onto 'Kamonyi' (0.86).
    close = difflib.get_close_matches(key, DISTRICT_BY_KEY.keys(), n=1, cutoff=0.9)
    if close:
        return DISTRICT_BY_KEY[close[0]], True
    return title(name), False


def parse_date(raw: str) -> str | None:
    m = DATE_RE.match(raw or "")
    if not m:
        return None
    day, month_name, year = m.group(1), m.group(2).lower(), m.group(3)
    month = MONTHS.get(month_name)
    if not month:
        return None
    try:
        return datetime(int(year), month, int(day)).date().isoformat()
    except ValueError:
        return None


def parse_clock(raw: str) -> str | None:
    m = CLOCK_RE.match(raw or "")
    if not m:
        return None
    hour, minute, meridiem = int(m.group(1)), int(m.group(2)), m.group(3).upper()
    if hour == 12:
        hour = 0
    if meridiem == "PM":
        hour += 12
    if hour > 23 or minute > 59:
        return None
    return f"{hour:02d}:{minute:02d}"


def parse_time_range(raw: str) -> tuple[str | None, str | None, int | None, bool]:
    """-> (start, end, duration_minutes, ongoing).

    'ongoing' is REG's "- Now" marker: the outage had not been restored when
    the page was written, so there is no published end time. Never impute one.
    """
    raw = (raw or "").strip()
    ongoing = bool(re.search(r"\bnow\b", raw, re.I))
    parts = [p.strip() for p in raw.split("-", 1)]
    start = parse_clock(parts[0]) if parts else None
    end = parse_clock(parts[1]) if len(parts) > 1 else None

    duration = None
    if start and end:
        s_h, s_m = (int(x) for x in start.split(":"))
        e_h, e_m = (int(x) for x in end.split(":"))
        duration = (e_h * 60 + e_m) - (s_h * 60 + s_m)
        if duration < 0:  # crosses midnight
            duration += 24 * 60
        if duration == 0:
            # "12:00 AM - 12:00 AM" and friends: 28 rows publish an end time
            # identical to the start. That is not a two-minute outage, it is a
            # row where nobody filled the field in. Treat it as no published
            # end -- the honest-uncertainty path -- rather than letting a
            # zero-length window read as a restoration time.
            end, duration = None, None
    return start, end, duration, ongoing


def split_districts(raw: str) -> tuple[list[str], list[str]]:
    """-> (districts, unrecognised names). Order preserved, duplicates dropped."""
    districts: list[str] = []
    unknown: list[str] = []
    for chunk in CHUNK_SPLIT_RE.split(raw or ""):
        if not chunk.strip():
            continue
        name, known = canonical_district(chunk)
        if not name:
            continue
        if not known:
            unknown.append(name)
        if name not in districts:
            districts.append(name)
    return districts, unknown


def classify_reason(reason: str) -> str:
    text = (reason or "").lower()
    for label, pattern in REASON_CATEGORIES:
        if re.search(pattern, text):
            return label
    return "other"


def extract_feeder(reason: str) -> str | None:
    names = [title(n.strip()) for n in FEEDER_RE.findall(reason or "")]
    names = [n for n in names if n and not n.isdigit()]
    return " & ".join(dict.fromkeys(names)) or None


def clean_chunk(chunk: str) -> str:
    chunk = PARENTHETICAL_RE.sub(" ", chunk)
    chunk = PREFIX_NOISE_RE.sub("", chunk.strip())
    chunk = SUFFIX_NOISE_RE.sub("", chunk)
    return re.sub(r"\s+", " ", chunk).strip(" .-")


def assign_sectors(sector_areas: str, districts: list[str]) -> tuple[list[tuple[str, str, bool]], str | None]:
    """-> ([(district, sector, inferred)], note)

    Walks chunks left to right. A chunk carrying an "in X" / "of X District"
    tail closes the current buffer and assigns all of it to X.
    """
    district_by_key = {norm(d): d for d in districts}
    pairs: list[tuple[str, str, bool]] = []
    note = None

    buffer: list[str] = []
    buffer_wildcard = False

    def flush(target: str | None, inferred: bool) -> None:
        nonlocal buffer, buffer_wildcard
        if target is None:
            buffer, buffer_wildcard = [], False
            return
        if buffer_wildcard and not buffer:
            pairs.append((target, "*", inferred))
        for name in buffer:
            pairs.append((target, name, inferred))
        buffer, buffer_wildcard = [], False

    for group in re.split(r"\s*[;.]\s+|\s*;\s*", sector_areas or ""):
        if not group.strip():
            continue
        if WILDCARD_RE.search(group):
            buffer_wildcard = True
        for chunk in CHUNK_SPLIT_RE.split(group):
            if not chunk.strip():
                continue
            hint = DISTRICT_HINT_RE.search(chunk)
            target = None
            if hint:
                hinted, _ = canonical_district(hint.group(1))
                target = district_by_key.get(norm(hinted))
                if target is None and len(districts) == 1:
                    target = districts[0]
                chunk = chunk[: hint.start()]
            sector_hint = SECTOR_HINT_RE.search(chunk)
            name = title(sector_hint.group(1)) if sector_hint else clean_chunk(chunk)
            if WILDCARD_RE.search(chunk):
                buffer_wildcard = True
                name = ""
            # "Ruhango, Nyanza and Huye Districts" -- the names ARE districts
            if name and norm(name) in district_by_key:
                pairs.append((district_by_key[norm(name)], "*", False))
                name = ""
            if name:
                buffer.append(title(name))
            if target:
                flush(target, inferred=False)
        # a ';' group boundary also closes an unassigned buffer
        if buffer or buffer_wildcard:
            if len(districts) == 1:
                flush(districts[0], inferred=False)

    if buffer or buffer_wildcard:
        if len(districts) == 1:
            flush(districts[0], inferred=False)
        elif districts:
            note = "sectors could not be tied to a single district; emitted against each"
            leftover, wildcard = list(buffer), buffer_wildcard
            for district in districts:
                buffer, buffer_wildcard = list(leftover), wildcard
                flush(district, inferred=True)
        else:
            note = "no district on the row"
            buffer, buffer_wildcard = [], False

    if not pairs and districts:
        note = note or "no sector names found; treated as district-wide"
        pairs = [(d, "*", len(districts) > 1) for d in districts]

    # de-duplicate, keeping the most confident assignment
    best: dict[tuple[str, str], bool] = {}
    for district, sector, inferred in pairs:
        key = (district, sector)
        best[key] = min(best.get(key, True), inferred)
    return [(d, s, inf) for (d, s), inf in best.items()], note


def parse_row(row: dict) -> tuple[list[dict], str | None]:
    date = parse_date(row.get("date", ""))
    start, end, duration, ongoing = parse_time_range(row.get("time", ""))
    districts, unknown_districts = split_districts(row.get("district_affected", ""))
    reason = (row.get("reason") or "").strip()
    status = (row.get("status") or "").strip().lower() or "past"

    if not date:
        return [], f"unparseable date: {row.get('date')!r}"
    if not districts:
        return [], f"no district: {row.get('district_affected')!r}"

    pairs, note = assign_sectors(row.get("sector_areas", ""), districts)
    if unknown_districts:
        note = note or f"district not on the official list: {', '.join(unknown_districts)}"

    raw_key = "|".join(
        str(row.get(k, "")) for k in
        ("date", "time", "district_affected", "sector_areas", "reason", "status")
    )
    outage_id = hashlib.sha1(raw_key.encode("utf-8")).hexdigest()[:12]

    records = []
    for district, sector, inferred in pairs:
        records.append({
            "outage_id": outage_id,
            "date": date,
            "start_time": start,
            "end_time": end,
            "duration_minutes": duration,
            "ongoing": ongoing,
            "district": district,
            "district_key": norm(district),
            "sector": sector,
            "sector_key": norm(sector) if sector != "*" else "*",
            "district_inferred": inferred,
            "reason_raw": reason,
            "reason_category": classify_reason(reason),
            "feeder": extract_feeder(reason),
            "status": status,
            "sector_areas_raw": (row.get("sector_areas") or "").strip(),
            "page_number": row.get("page_number"),
            "source_url": row.get("source_url"),
        })
    return records, note


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in", dest="infile", type=Path, default=DEFAULT_IN)
    ap.add_argument("--out", dest="outfile", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--failures", dest="failfile", type=Path, default=DEFAULT_FAILURES)
    args = ap.parse_args(argv)

    payload = json.loads(args.infile.read_text())
    raw_rows = payload["records"]

    records: list[dict] = []
    failures: list[dict] = []
    for row in raw_rows:
        parsed, note = parse_row(row)
        records.extend(parsed)
        if note or not parsed:
            failures.append({
                # dropped == we produced nothing and lost the row; flagged == we
                # kept it but the district assignment is less than certain.
                "kind": "dropped" if not parsed else "flagged",
                "reason": note or "no records produced",
                "row": row,
            })

    records.sort(key=lambda r: (r["date"], r["district"], r["sector"]), reverse=True)

    districts = sorted({r["district"] for r in records})
    sectors = sorted({(r["district"], r["sector"]) for r in records if r["sector"] != "*"})

    dropped = [f for f in failures if f["kind"] == "dropped"]

    out = {
        "source_url": payload.get("source_url"),
        "scraped_at": payload.get("scraped_at"),
        "parsed_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "raw_row_count": len(raw_rows),
        "record_count": len(records),
        "flagged_row_count": len(failures),
        "dropped_row_count": len(dropped),
        "district_count": len(districts),
        "sector_count": len(sectors),
        "records": records,
    }
    args.outfile.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    args.failfile.write_text(json.dumps(
        {"flagged": len(failures), "dropped": len(dropped),
         "of_rows": len(raw_rows), "failures": failures},
        ensure_ascii=False, indent=1,
    ))

    pct = 100 * len(failures) / max(len(raw_rows), 1)
    print(f"{len(raw_rows)} raw rows -> {len(records)} exploded records")
    print(f"{len(districts)} districts, {len(sectors)} (district, sector) pairs")
    print(f"{len(failures)} rows flagged ({pct:.1f}%), {len(dropped)} dropped -> {args.failfile}")
    print(f"wrote {args.outfile}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
