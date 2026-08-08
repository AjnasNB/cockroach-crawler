#!/usr/bin/env python3
"""Build the Cockroach Crawler release-candidate technical white paper."""

from __future__ import annotations

import html
import re
import shutil
from pathlib import Path

from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.md"
OUTPUT = ROOT / "output" / "pdf" / "Cockroach-Crawler-Technical-White-Paper-v0.7.0-rc.1.pdf"
DOCS_COPY = ROOT / "docs" / OUTPUT.name
SITE_COPY = ROOT / "website" / "paper" / OUTPUT.name

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = 23 * mm
RIGHT = 20 * mm
TOP = 22 * mm
BOTTOM = 19 * mm
WIDTH = PAGE_WIDTH - LEFT - RIGHT

INK = colors.HexColor("#07100E")
PAPER = colors.HexColor("#F2F6F2")
WHITE = colors.HexColor("#F5FAF6")
MUTED = colors.HexColor("#5A6C65")
GREEN = colors.HexColor("#35D87B")
DARK_GREEN = colors.HexColor("#176841")
RULE = colors.HexColor("#C6D4CC")
CODE_BG = colors.HexColor("#091611")
WARNING = colors.HexColor("#EAA477")

rl_config.invariant = 1


def register_fonts() -> tuple[str, str, str, str]:
    choices = [
        ("C:/Windows/Fonts/aptos.ttf", "C:/Windows/Fonts/aptos-bold.ttf", "C:/Windows/Fonts/aptos-italic.ttf", "C:/Windows/Fonts/consola.ttf"),
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/ariali.ttf", "C:/Windows/Fonts/consola.ttf"),
    ]
    for regular, bold, italic, mono in choices:
        paths = [Path(value) for value in (regular, bold, italic, mono)]
        if all(path.exists() for path in paths):
            pdfmetrics.registerFont(TTFont("CCBody", str(paths[0])))
            pdfmetrics.registerFont(TTFont("CCBody-Bold", str(paths[1])))
            pdfmetrics.registerFont(TTFont("CCBody-Italic", str(paths[2])))
            pdfmetrics.registerFont(TTFont("CCMono", str(paths[3])))
            pdfmetrics.registerFontFamily(
                "CCBody",
                normal="CCBody",
                bold="CCBody-Bold",
                italic="CCBody-Italic",
                boldItalic="CCBody-Bold",
            )
            return "CCBody", "CCBody-Bold", "CCBody-Italic", "CCMono"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Courier"


BODY, BOLD, ITALIC, MONO = register_fonts()
BASE = getSampleStyleSheet()
STYLES = {
    "cover-kicker": ParagraphStyle(
        "CoverKicker", parent=BASE["Normal"], fontName=BOLD, fontSize=9,
        leading=12, textColor=GREEN, spaceAfter=9 * mm,
    ),
    "cover-title": ParagraphStyle(
        "CoverTitle", parent=BASE["Title"], fontName=BOLD, fontSize=29,
        leading=33, textColor=WHITE, spaceAfter=6 * mm,
    ),
    "cover-subtitle": ParagraphStyle(
        "CoverSubtitle", parent=BASE["Normal"], fontName=BODY, fontSize=13,
        leading=19, textColor=colors.HexColor("#B5C6BE"), spaceAfter=12 * mm,
    ),
    "cover-meta": ParagraphStyle(
        "CoverMeta", parent=BASE["Normal"], fontName=BODY, fontSize=8.8,
        leading=13.6, textColor=colors.HexColor("#A8BAB1"),
    ),
    "h1": ParagraphStyle(
        "PaperH1", parent=BASE["Heading1"], fontName=BOLD, fontSize=19,
        leading=23, textColor=INK, spaceBefore=7 * mm, spaceAfter=3 * mm,
        keepWithNext=True,
    ),
    "h2": ParagraphStyle(
        "PaperH2", parent=BASE["Heading2"], fontName=BOLD, fontSize=12.7,
        leading=16.5, textColor=DARK_GREEN, spaceBefore=5 * mm,
        spaceAfter=2.5 * mm, keepWithNext=True,
    ),
    "body": ParagraphStyle(
        "PaperBody", parent=BASE["BodyText"], fontName=BODY, fontSize=9.15,
        leading=13.8, textColor=INK, spaceAfter=2.7 * mm,
        allowWidows=0, allowOrphans=0,
    ),
    "list": ParagraphStyle(
        "PaperList", parent=BASE["BodyText"], fontName=BODY, fontSize=9.15,
        leading=13.8, textColor=INK, leftIndent=8 * mm,
        firstLineIndent=-8 * mm, spaceAfter=1.5 * mm,
        allowWidows=0, allowOrphans=0,
    ),
    "small": ParagraphStyle(
        "PaperSmall", parent=BASE["BodyText"], fontName=BODY, fontSize=7.3,
        leading=9.8, textColor=MUTED,
    ),
    "code": ParagraphStyle(
        "PaperCode", parent=BASE["Code"], fontName=MONO, fontSize=7,
        leading=9.7, textColor=WHITE, splitLongWords=True,
    ),
    "toc-title": ParagraphStyle(
        "TocTitle", parent=BASE["Heading1"], fontName=BOLD, fontSize=22,
        leading=26, textColor=INK, spaceAfter=6 * mm,
    ),
}


class CrawlerPaper(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title="Cockroach Crawler: A governed, evidence-preserving web acquisition layer for AI agents",
            author="Ajnas N B",
            subject="Technical white paper for the Cockroach Crawler 0.7 release candidate",
            creator="Cockroach Crawler deterministic white-paper builder",
            keywords="web crawler, AI agents, evidence provenance, network policy, reproducible evaluation",
            pageCompression=1,
        )
        cover = Frame(LEFT, BOTTOM, WIDTH, PAGE_HEIGHT - BOTTOM - 14 * mm,
                      id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        body = Frame(LEFT, BOTTOM, WIDTH, PAGE_HEIGHT - TOP - BOTTOM,
                     id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="Cover", frames=[cover], onPage=self.cover_page),
            PageTemplate(id="Body", frames=[body], onPage=self.body_page),
        ])

    @staticmethod
    def cover_page(canvas, _doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#040B08"))
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        canvas.setFillColor(GREEN)
        canvas.rect(0, PAGE_HEIGHT - 7 * mm, PAGE_WIDTH, 7 * mm, stroke=0, fill=1)
        canvas.setStrokeColor(colors.HexColor("#1E3B2E"))
        for offset in (0, 18, 36, 54):
            x = LEFT + offset * mm
            canvas.line(x, 28 * mm, x + 45 * mm, 73 * mm)
        mark_left = PAGE_WIDTH - RIGHT - 27 * mm
        canvas.setFillColor(colors.HexColor("#0A1711"))
        canvas.rect(mark_left, 241 * mm, 27 * mm, 27 * mm, stroke=0, fill=1)
        canvas.setStrokeColor(GREEN)
        canvas.setLineWidth(1)
        canvas.rect(mark_left + 4 * mm, 245 * mm, 19 * mm, 19 * mm, stroke=1, fill=0)
        canvas.setFont(BOLD, 12)
        canvas.setFillColor(GREEN)
        canvas.drawCentredString(mark_left + 13.5 * mm, 253 * mm, "CC")
        canvas.setFont(MONO, 5.5)
        canvas.setFillColor(colors.HexColor("#8DA299"))
        canvas.drawCentredString(mark_left + 13.5 * mm, 248 * mm, "RC / 07")
        canvas.setStrokeColor(colors.HexColor("#1D362B"))
        canvas.line(LEFT, 16 * mm, PAGE_WIDTH - RIGHT, 16 * mm)
        canvas.setFont(MONO, 7.2)
        canvas.drawString(LEFT, 10 * mm, "COCKROACH CRAWLER / TECHNICAL WHITE PAPER")
        canvas.drawRightString(PAGE_WIDTH - RIGHT, 10 * mm, "AUGUST 2026")
        canvas.restoreState()

    @staticmethod
    def body_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        canvas.setStrokeColor(RULE)
        canvas.line(LEFT, PAGE_HEIGHT - 14 * mm, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 14 * mm)
        canvas.setFont(BOLD, 7.2)
        canvas.setFillColor(DARK_GREEN)
        canvas.drawString(LEFT, PAGE_HEIGHT - 10 * mm, "COCKROACH CRAWLER")
        canvas.setFont(BODY, 7.2)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 10 * mm, "BOUND REACH. PRESERVE EVIDENCE.")
        canvas.setStrokeColor(RULE)
        canvas.line(LEFT, 13 * mm, PAGE_WIDTH - RIGHT, 13 * mm)
        canvas.setFont(BODY, 7.2)
        canvas.drawString(LEFT, 8 * mm, "Ajnas N B - Manuscript v0.7.0-rc.1")
        canvas.drawRightString(PAGE_WIDTH - RIGHT, 8 * mm, str(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph):
            return
        level = getattr(flowable, "_toc_level", None)
        if level is None:
            return
        title = flowable.getPlainText()
        key = f"section-{self.seq.nextf('heading')}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(title, key, level=level, closed=False)
        self.notify("TOCEntry", (level, title, self.page, key))


def inline(value: str) -> str:
    protected: dict[str, str] = {}

    def reserve(fragment: str) -> str:
        token = f"CCPLACEHOLDER{len(protected)}TOKEN"
        protected[token] = fragment
        return token

    value = re.sub(
        r"`([^`]+)`",
        lambda match: reserve(f'<font name="{MONO}" color="#176841">{html.escape(match.group(1))}</font>'),
        value,
    )
    value = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda match: reserve(
            f'<link href="{html.escape(match.group(2), quote=True)}" color="#176841"><u>{html.escape(match.group(1))}</u></link>'
        ),
        value,
    )
    value = html.escape(value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", value)
    for token, fragment in protected.items():
        value = value.replace(token, fragment)
    return value


def heading(value: str, level: int) -> Paragraph:
    paragraph = Paragraph(inline(value), STYLES["h1" if level == 2 else "h2"])
    paragraph._toc_level = 0 if level == 2 else 1
    return paragraph


def code_block(value: str) -> Table:
    pre = Preformatted(value, STYLES["code"], maxLineLength=94)
    table = Table([[pre]], colWidths=[WIDTH], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, DARK_GREEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return table


def list_flowables(items: list[str], ordered: bool) -> list[Table]:
    rows = []
    for index, item in enumerate(items, start=1):
        marker = f"{index}." if ordered else "&#8226;"
        rows.append(f"<b>{marker}</b>&nbsp;&nbsp;{inline(item)}")
    paragraph = Paragraph("<br/>" + "<br/><br/>".join(rows) + "<br/>", STYLES["body"])
    table = Table([[paragraph]], colWidths=[WIDTH], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return [table]


def parse_markdown(text: str) -> list:
    lines = text.splitlines()
    story: list = []
    paragraph: list[str] = []
    code: list[str] = []
    in_code = False

    def flush():
        if paragraph:
            joined = " ".join(line.strip() for line in paragraph)
            story.append(Paragraph(inline(joined), STYLES["body"]))
            paragraph.clear()

    index = 0
    while index < len(lines):
        raw = lines[index]
        line = raw.rstrip()
        if line.startswith("```"):
            if in_code:
                story.append(code_block("\n".join(code)))
                story.append(Spacer(1, 2.2 * mm))
                code.clear()
                in_code = False
            else:
                flush()
                in_code = True
            index += 1
            continue
        if in_code:
            code.append(raw)
            index += 1
            continue
        match = re.match(r"^(#{2,3})\s+(.+)$", line)
        if match:
            flush()
            story.append(heading(match.group(2), len(match.group(1))))
            index += 1
            continue
        if re.match(r"^(?:- |\d+\. )", line):
            flush()
            ordered = bool(re.match(r"^\d+\.", line))
            items: list[str] = []
            while index < len(lines) and re.match(r"^(?:- |\d+\. )", lines[index]):
                items.append(re.sub(r"^(?:- |\d+\. )", "", lines[index]).strip())
                index += 1
            story.append(Spacer(1, 0.8 * mm))
            story.extend(list_flowables(items, ordered))
            story.append(Spacer(1, 1.8 * mm))
            continue
        if not line.strip():
            flush()
        else:
            paragraph.append(line)
        index += 1
    flush()
    return story


def cover_story() -> list:
    return [
        Spacer(1, 66 * mm),
        Paragraph("COCKROACH CRAWLER / 0.7 RELEASE CANDIDATE", STYLES["cover-kicker"]),
        Paragraph("A governed, evidence-preserving web acquisition layer for AI agents", STYLES["cover-title"]),
        Paragraph(
            "Bound reach. Preserve evidence. Reject the candidate when the frozen gate fails.",
            STYLES["cover-subtitle"],
        ),
        HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#244337")),
        Spacer(1, 8 * mm),
        Paragraph(
            "<b>Author:</b> Ajnas N B<br/>"
            "<b>Manuscript:</b> v0.7.0-rc.1<br/>"
            "<b>Date:</b> 8 August 2026<br/>"
            "<b>Candidate commit:</b> 90825063d447f07345388d040b1428a311109c2b<br/>"
            "<b>Published npm baseline:</b> 0.6.1<br/>"
            "<b>Software:</b> MIT<br/>"
            "<b>Paper:</b> Creative Commons Attribution 4.0 International<br/>"
            "<b>DOI:</b> 10.5281/zenodo.21851008 (reserved)<br/>"
            "<b>Status:</b> Implementation-backed release-candidate white paper. "
            "No independent peer review, independent security certification, 0.7 software release, or best-crawler claim.",
            STYLES["cover-meta"],
        ),
        NextPageTemplate("Body"),
        PageBreak(),
    ]


def toc_story() -> list:
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle("TOC1", fontName=BOLD, fontSize=8.5, leading=10.8, textColor=INK, leftIndent=0, firstLineIndent=0),
        ParagraphStyle("TOC2", fontName=BODY, fontSize=7.2, leading=9.2, textColor=MUTED, leftIndent=8 * mm, firstLineIndent=0),
    ]
    return [
        Paragraph("Contents", STYLES["toc-title"]),
        Paragraph("Architecture, evidence protocol, frozen rejection, reproducibility, and archival boundary.", STYLES["body"]),
        Spacer(1, 2.5 * mm),
        toc,
        PageBreak(),
    ]


def build() -> None:
    text = SOURCE.read_text(encoding="utf-8")
    start = text.find("## Abstract")
    if start < 0:
        raise ValueError(f"{SOURCE} does not contain an Abstract section")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    DOCS_COPY.parent.mkdir(parents=True, exist_ok=True)
    SITE_COPY.parent.mkdir(parents=True, exist_ok=True)
    story = cover_story() + toc_story() + parse_markdown(text[start:])
    CrawlerPaper(str(OUTPUT)).multiBuild(story)
    shutil.copyfile(OUTPUT, DOCS_COPY)
    shutil.copyfile(OUTPUT, SITE_COPY)
    print(OUTPUT)


if __name__ == "__main__":
    build()
