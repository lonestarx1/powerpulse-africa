#!/usr/bin/env python3
"""Scrape the REG planned/current/past power outage table.

Source: https://www.reg.rw/customer-service/power-outages/

Pagination note (important, learned the hard way):
    The listing is a TYPO3 widget paginated with
        ?tx_poweroutage_poweroutagelist[@widget_0][currentPage]=N&cHash=...
    The `cHash` is mandatory. Requesting a page number WITHOUT a valid cHash
    silently returns page 1 with HTTP 200 -- no error, no redirect. Iterating
    1..126 naively therefore yields 126 identical copies of page 1 and looks
    like a successful run.

    So we crawl the "Next" link chain instead, taking each page's cHash from
    the previous page's HTML, and we fingerprint every page to assert it is
    actually new. If the fingerprint repeats, we stop and shout.

Writes: data/outages_raw.json

    {
      "source_url": "...", "scraped_at": "...",
      "page_count": 126, "record_count": 504,
      "records": [ {date, time, district_affected, sector_areas, reason,
                    status, page_number, source_url}, ... ]
    }

The file is rewritten after every page, so it is always valid JSON and a
partial run still leaves usable data on disk.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.reg.rw/customer-service/power-outages/"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
COLUMNS = ["date", "time", "district_affected", "sector_areas", "reason", "status"]

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / "data" / "outages_raw.json"

# matches ...currentPage%5D=7... in a pagination href
PAGE_IN_HREF = re.compile(r"currentPage(?:%5D|\])=(\d+)")


def clean(text: str) -> str:
    """Collapse the <br/>-riddled cell text into one flat string.

    '05th<br />August 2026'          -> '05th August 2026'
    '12:00<br/>PM - 02:00<br />PM'   -> '12:00 PM - 02:00 PM'
    """
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def fetch(session: requests.Session, url: str, retries: int = 2, delay: float = 1.0) -> str | None:
    """GET with retries. Returns HTML, or None if the page never came back."""
    for attempt in range(retries + 1):
        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            if attempt == retries:
                print(f"  !! giving up on {url}: {exc}", file=sys.stderr)
                return None
            wait = delay * (attempt + 2)
            print(f"  .. retry {attempt + 1}/{retries} after {exc} (sleep {wait:.0f}s)", file=sys.stderr)
            time.sleep(wait)
    return None


def parse_rows(html: str) -> list[list[str]]:
    """Pull the outage table rows out of a listing page."""
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None:
        return []

    body = table.find("tbody") or table
    rows = []
    for tr in body.find_all("tr"):
        cells = tr.find_all("td")
        if len(cells) != len(COLUMNS):
            # header row, spacer row, or a layout row -- not data
            continue
        rows.append([clean(td.get_text(" ", strip=True)) for td in cells])
    return rows


def find_next_url(html: str, current_page: int, base: str) -> str | None:
    """Find the href for current_page + 1 in the pagination block."""
    soup = BeautifulSoup(html, "lxml")
    want = current_page + 1

    labelled_next = None
    for a in soup.find_all("a", href=True):
        href = a["href"]
        match = PAGE_IN_HREF.search(href)
        if not match:
            continue
        page = int(match.group(1))
        label = a.get_text(strip=True).lower()
        if page == want:
            if label == str(want):
                return urljoin(base, href)  # numbered link, most explicit
            if label in ("next", "next >", ">"):
                labelled_next = urljoin(base, href)
    return labelled_next


def last_page_number(html: str) -> int | None:
    """Read the 'Last' link so we know how far the chain should run."""
    soup = BeautifulSoup(html, "lxml")
    best = None
    for a in soup.find_all("a", href=True):
        match = PAGE_IN_HREF.search(a["href"])
        if match:
            page = int(match.group(1))
            best = page if best is None else max(best, page)
    return best


def fingerprint(rows: list[list[str]]) -> str:
    """Identify a page by its contents, to catch the silent page-1 fallback."""
    joined = "|".join("~".join(r) for r in rows)
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()


def scrape(max_pages: int, delay: float, out_path: Path) -> int:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})

    scraped_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    url: str | None = BASE_URL
    page = 1
    seen_fingerprints: dict[str, int] = {}
    records: list[dict] = []
    failed_pages: list[int] = []
    expected_last: int | None = None

    def dump() -> None:
        """Rewrite the whole file -- always valid JSON, survives a kill."""
        payload = {
            "source_url": BASE_URL,
            "scraped_at": scraped_at,
            "page_count": len(seen_fingerprints),
            "record_count": len(records),
            "records": records,
        }
        tmp = out_path.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        tmp.replace(out_path)  # atomic -- never leave a half-written file

    while url and page <= max_pages:
        html = fetch(session, url, delay=delay)
        if html is None:
            failed_pages.append(page)
            break  # chain is broken -- we cannot discover the next cHash

        if expected_last is None:
            expected_last = last_page_number(html)
            if expected_last:
                print(f"site reports {expected_last} pages")

        rows = parse_rows(html)
        if not rows:
            print(f"page {page}: no data rows -- stopping", file=sys.stderr)
            break

        fp = fingerprint(rows)
        if fp in seen_fingerprints:
            print(
                f"page {page}: identical to page {seen_fingerprints[fp]} "
                f"-- pagination broke (missing/stale cHash). Stopping.",
                file=sys.stderr,
            )
            break
        seen_fingerprints[fp] = page

        for row in rows:
            record = dict(zip(COLUMNS, row))
            record["page_number"] = page
            record["source_url"] = url
            records.append(record)
        dump()

        print(f"page {page:>3}/{expected_last or '?'}  rows={len(rows):>2}  total={len(records)}")

        next_url = find_next_url(html, page, BASE_URL)
        if next_url is None:
            print(f"no link to page {page + 1} -- end of listing")
            break
        url, page = next_url, page + 1
        time.sleep(delay)

    dump()
    total = len(records)
    print(f"\nwrote {total} records from {len(seen_fingerprints)} pages -> {out_path}")
    if failed_pages:
        print(f"FAILED pages: {failed_pages}", file=sys.stderr)
    if expected_last and len(seen_fingerprints) < expected_last:
        print(
            f"WARNING: got {len(seen_fingerprints)} of {expected_last} pages",
            file=sys.stderr,
        )
    return total


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max-pages", type=int, default=200, help="safety stop (default: 200)")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests (default: 1.0)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output JSON (default: {DEFAULT_OUT})")
    args = ap.parse_args()

    total = scrape(args.max_pages, args.delay, args.out)
    return 0 if total else 1


if __name__ == "__main__":
    raise SystemExit(main())
