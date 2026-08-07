"""Produce main-content extractions from the pinned WCEB corpus for baseline tools.

This script does not score anything. It writes one plain-text file per page per
tool so that extraction-comparison.mjs can score every tool with the identical
metric. Keeping extraction and scoring in separate processes is deliberate: a
comparison where the author also controls the opposing tool's scoring is not
worth reading.

Usage:
    pip install trafilatura readability-lxml
    python extract_baselines.py --dataset <WCEB checkout> --out <directory>

Each tool writes to <out>/<tool>/<page-id>.txt. A tool that raises on a page
writes an empty file, which scores as zero rather than silently dropping the
page from that tool's average.
"""

import argparse
import gzip
import pathlib
import sys


def read_html(path: pathlib.Path) -> str:
    with gzip.open(path, "rb") as handle:
        return handle.read().decode("utf-8", errors="replace")


def extract_trafilatura(html: str, url: str) -> str:
    import trafilatura

    return trafilatura.extract(
        html,
        url=url,
        include_comments=False,
        include_tables=True,
        favor_recall=False,
    ) or ""


def extract_readability(html: str, url: str) -> str:
    from readability import Document
    from lxml import html as lxml_html

    summary = Document(html).summary()
    return lxml_html.fromstring(summary).text_content()


EXTRACTORS = {
    "trafilatura": extract_trafilatura,
    "readability": extract_readability,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--split", default="test")
    parser.add_argument("--tools", default=",".join(EXTRACTORS))
    arguments = parser.parse_args()

    dataset = pathlib.Path(arguments.dataset)
    ground_truth = dataset / arguments.split / "ground-truth"
    html_directory = dataset / arguments.split / "html"
    out = pathlib.Path(arguments.out)

    tools = [name.strip() for name in arguments.tools.split(",") if name.strip()]
    for name in tools:
        if name not in EXTRACTORS:
            print(f"Unknown tool '{name}'. Known: {', '.join(EXTRACTORS)}", file=sys.stderr)
            return 1
        (out / name).mkdir(parents=True, exist_ok=True)

    import json

    pages = sorted(path for path in ground_truth.glob("*.json"))
    print(f"{len(pages)} pages, tools: {', '.join(tools)}")

    failures = {name: 0 for name in tools}
    for index, truth_path in enumerate(pages, start=1):
        page_id = truth_path.stem
        record = json.loads(truth_path.read_text(encoding="utf-8"))
        url = record.get("url", "")
        html = read_html(html_directory / f"{page_id}.html.gz")

        for name in tools:
            try:
                text = EXTRACTORS[name](html, url)
            except Exception:
                text = ""
                failures[name] += 1
            (out / name / f"{page_id}.txt").write_text(text or "", encoding="utf-8")

        if index % 100 == 0:
            print(f"  {index}/{len(pages)}")

    for name in tools:
        print(f"{name}: {failures[name]} page(s) raised and were written empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
