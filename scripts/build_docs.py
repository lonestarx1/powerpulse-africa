#!/usr/bin/env python3
"""Rebuild the docs PDFs from their markdown sources.

    python3 scripts/build_docs.py             # the tracked set
    python3 scripts/build_docs.py DEMO_SCRIPT # or name specific docs

Needs pandoc (`brew install pandoc`) and Google Chrome, which is already on
every machine on this team. Chrome does the paged rendering, so there is no
LaTeX and no weasyprint/pango native-library hunt -- the markdown becomes a
standalone HTML file styled by docs/print.css, and Chrome prints it.

The PDFs are what a judge reads when they will not clone the repo, so they
have to be rebuilt whenever the markdown changes. A stale PDF still saying
"name TBD" is worse than no PDF at all.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DEFAULT = ["ONE_PAGER", "CONTEXT", "PLAN", "DEMO_SCRIPT"]

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]


def find_chrome() -> str | None:
    for path in CHROME_CANDIDATES:
        if Path(path).exists():
            return path
    return shutil.which("chromium") or shutil.which("google-chrome")


def build(name: str, chrome: str, workdir: Path) -> bool:
    source = DOCS / f"{name}.md"
    if not source.exists():
        print(f"  {name}: no {source.name}, skipped")
        return True

    html = workdir / f"{name}.html"
    target = DOCS / f"{name}.pdf"

    result = subprocess.run(
        [
            "pandoc", str(source),
            "-o", str(html),
            "--standalone",
            "--embed-resources",
            "--css", str(DOCS / "print.css"),
            "--metadata", f"title={name.replace('_', ' ').title()}",
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"  {name}: pandoc failed\n{result.stderr.strip()}")
        return False

    result = subprocess.run(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            f"--print-to-pdf={target}",
            html.as_uri(),
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0 or not target.exists():
        print(f"  {name}: chrome failed\n{result.stderr.strip()[:400]}")
        return False

    print(f"  {name}.pdf  {target.stat().st_size // 1024} KB")
    return True


def main(argv: list[str]) -> int:
    if not shutil.which("pandoc"):
        print("pandoc is not installed -- brew install pandoc")
        return 1
    chrome = find_chrome()
    if not chrome:
        print("no Chrome/Chromium found -- see CHROME_CANDIDATES in this file")
        return 1

    names = argv[1:] or DEFAULT
    print(f"building {len(names)} docs from {DOCS}")
    with tempfile.TemporaryDirectory() as tmp:
        ok = all([build(n, chrome, Path(tmp)) for n in names])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
