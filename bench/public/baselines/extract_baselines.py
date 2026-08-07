"""Produce main-content extractions from the pinned WCEB corpus for baseline tools.

This script does not score anything. It writes one plain-text file per page per
tool so that extraction-comparison.mjs can score every tool with the identical
metric. Keeping extraction and scoring in separate processes makes the tool
invocation and plain-text outputs auditable. These separately generated outputs
are not third-party independent validation.

Usage:
    pip install -r requirements.lock.txt
    python extract_baselines.py --dataset <WCEB checkout> --out <directory>

Each tool writes to <out>/<tool>/<page-id>.txt. A tool that raises on a page
writes an empty file, which scores as zero rather than silently dropping the
page from that tool's average.
"""

import argparse
import gzip
import hashlib
import importlib.metadata
import json
import pathlib
import platform
import subprocess
import sys


EXPECTED_REVISION = "62ff86d12ea72c80c31fb810ff1a724fad687bea"


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


def expected_dependencies() -> dict[str, str]:
    requirements = pathlib.Path(__file__).with_name("requirements.lock.txt")
    result: dict[str, str] = {}
    for raw_line in requirements.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        name, expected = line.split("==", maxsplit=1)
        result[name] = expected
    return result


def verify_dependencies() -> dict[str, str]:
    expected = expected_dependencies()
    observed = {name: importlib.metadata.version(name) for name in expected}
    if observed != expected:
        raise RuntimeError(f"Baseline dependency drift: expected {expected}, observed {observed}")
    return observed


def output_digest(directory: pathlib.Path, pages: list[pathlib.Path]) -> str:
    digest = hashlib.sha256()
    for page in pages:
        payload = (
            (directory / f"{page.stem}.txt")
            .read_text(encoding="utf-8")
            .replace("\r\n", "\n")
            .encode("utf-8")
        )
        digest.update(page.stem.encode("utf-8"))
        digest.update(b"\0")
        digest.update(payload)
        digest.update(b"\0")
    return digest.hexdigest()


def git(dataset: pathlib.Path, *arguments: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(dataset), *arguments],
        text=True,
        stderr=subprocess.PIPE,
    ).strip()


def is_within(directory: pathlib.Path, candidate: pathlib.Path) -> bool:
    try:
        candidate.resolve().relative_to(directory.resolve())
        return True
    except ValueError:
        return False


def assert_clean_inputs(
    dataset: pathlib.Path,
    split: str,
    out: pathlib.Path,
) -> str:
    revision = git(dataset, "rev-parse", "HEAD")
    if revision != EXPECTED_REVISION:
        raise RuntimeError(
            f"WCEB revision mismatch: expected {EXPECTED_REVISION}, received {revision}."
        )

    tracked_changes = git(dataset, "status", "--porcelain=v1", "--untracked-files=no")
    if tracked_changes:
        raise RuntimeError(f"WCEB checkout has tracked changes:\n{tracked_changes}")

    inputs = [f"{split}/ground-truth", f"{split}/html"]
    evaluated_changes = git(
        dataset,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--ignored=matching",
        "--",
        *inputs,
    )
    if evaluated_changes:
        raise RuntimeError(
            "WCEB evaluated inputs must be clean, including untracked or ignored files:\n"
            f"{evaluated_changes}"
        )

    for relative in inputs:
        input_directory = dataset / relative
        if is_within(input_directory, out):
            raise RuntimeError(
                f"Baseline output must be outside evaluated WCEB inputs: {input_directory}"
            )

    return revision


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--split", default="test", choices=("dev", "test"))
    parser.add_argument("--tools", default=",".join(EXTRACTORS))
    arguments = parser.parse_args()
    dataset = pathlib.Path(arguments.dataset).resolve()
    ground_truth = dataset / arguments.split / "ground-truth"
    html_directory = dataset / arguments.split / "html"
    out = pathlib.Path(arguments.out).resolve()
    revision = assert_clean_inputs(dataset, arguments.split, out)
    dependencies = verify_dependencies()

    tools = [name.strip() for name in arguments.tools.split(",") if name.strip()]
    for name in tools:
        if name not in EXTRACTORS:
            print(f"Unknown tool '{name}'. Known: {', '.join(EXTRACTORS)}", file=sys.stderr)
            return 1
        (out / name).mkdir(parents=True, exist_ok=True)

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

    manifest = {
        "schemaVersion": 1,
        "datasetRevision": revision,
        "split": arguments.split,
        "pages": len(pages),
        "tools": tools,
        "failures": failures,
        "python": platform.python_version(),
        "dependencies": dependencies,
        "outputSha256": {
            name: output_digest(out / name, pages)
            for name in tools
        },
    }
    (out / "_manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
