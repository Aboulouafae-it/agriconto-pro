from __future__ import annotations

import re
from html import unescape
from io import BytesIO
from textwrap import wrap


PAGE_WIDTH = 595
PAGE_HEIGHT = 842
MARGIN_X = 48
TOP_Y = 790
BOTTOM_Y = 54


def html_to_pdf_bytes(html: str, *, title: str, report_id: str) -> bytes:
    """Render a conservative A4 PDF without external system dependencies.

    The project keeps HTML as the primary report template. This renderer converts
    the same server-side HTML into a printable PDF using basic PDF text drawing.
    It is intentionally dependency-light for Debian desktop packaging; it can be
    replaced later by WeasyPrint or a Chromium renderer without changing API
    contracts.
    """

    lines = _html_to_lines(html)
    canvas = _PdfDocument(title=title, report_id=report_id)
    canvas.add_title(title)
    for line in lines:
        canvas.add_wrapped_text(line)
    return canvas.finish()


def _html_to_lines(html: str) -> list[str]:
    content = html
    content = re.sub(r"<style\b[^>]*>.*?</style>", "", content, flags=re.I | re.S)
    content = re.sub(r"<svg\b[^>]*>.*?</svg>", "[QR verifica]", content, flags=re.I | re.S)
    content = re.sub(r"</(h1|h2|h3|p|div|section|header|main|tr|dl)>", "\n", content, flags=re.I)
    content = re.sub(r"</(td|th|dt)>", "  ", content, flags=re.I)
    content = re.sub(r"<br\s*/?>", "\n", content, flags=re.I)
    content = re.sub(r"<[^>]+>", "", content)
    content = unescape(content)
    raw_lines = [re.sub(r"\s+", " ", line).strip() for line in content.splitlines()]
    return [line for line in raw_lines if line]


class _PdfDocument:
    def __init__(self, *, title: str, report_id: str) -> None:
        self.title = title
        self.report_id = report_id
        self.pages: list[list[str]] = []
        self.current: list[str] = []
        self.y = TOP_Y
        self.page_number = 0
        self._new_page()

    def add_title(self, title: str) -> None:
        self._text(title, 20, bold=True)
        self._text("AgriConto Pro - documento gestionale", 10)
        self._separator()

    def add_wrapped_text(self, text: str) -> None:
        max_chars = 86
        for line in wrap(text, width=max_chars, break_long_words=False) or [""]:
            if self.y < BOTTOM_Y:
                self._new_page()
            size = 13 if _looks_like_heading(line) else 9
            self._text(line, size, bold=_looks_like_heading(line))

    def finish(self) -> bytes:
        self._footer()
        return _write_pdf(self.pages)

    def _new_page(self) -> None:
        if self.current:
            self._footer()
        self.page_number += 1
        self.current = []
        self.pages.append(self.current)
        self.y = TOP_Y
        self._header()

    def _header(self) -> None:
        self.current.extend(
            [
                "0.18 0.37 0.29 rg",
                f"36 {PAGE_HEIGHT - 54} 523 34 re f",
                "1 1 1 rg",
                _pdf_text("AgriConto Pro", 52, PAGE_HEIGHT - 34, 13, bold=True),
                _pdf_text(self.title, 380, PAGE_HEIGHT - 34, 8),
                "0 0 0 rg",
            ]
        )
        self.y = PAGE_HEIGHT - 82

    def _footer(self) -> None:
        self.current.extend(
            [
                "0.45 0.45 0.45 rg",
                _pdf_text(
                    "Documento gestionale generato da AgriConto Pro. Verificare con un professionista abilitato.",
                    48,
                    28,
                    7,
                ),
                _pdf_text(f"Report ID {self.report_id} - Pagina {self.page_number}", 420, 28, 7),
                "0 0 0 rg",
            ]
        )

    def _separator(self) -> None:
        if self.y < BOTTOM_Y + 20:
            self._new_page()
        self.current.append("0.85 0.88 0.85 RG")
        self.current.append(f"{MARGIN_X} {self.y - 8} 500 0 l S")
        self.y -= 22

    def _text(self, text: str, size: int, *, bold: bool = False) -> None:
        if self.y < BOTTOM_Y:
            self._new_page()
        self.current.append(_pdf_text(text, MARGIN_X, self.y, size, bold=bold))
        self.y -= size + 6


def _looks_like_heading(line: str) -> bool:
    return len(line) < 72 and any(
        marker in line.lower()
        for marker in [
            "report ",
            "sintesi",
            "spese",
            "vendite",
            "lavoratori",
            "documenti",
            "colture",
            "dati report",
            "checklist",
            "disclaimer",
        ]
    )


def _pdf_text(text: str, x: int, y: int, size: int, *, bold: bool = False) -> str:
    font = "F2" if bold else "F1"
    safe = _pdf_escape(_pdf_charset(text))
    return f"BT /{font} {size} Tf {x} {y} Td ({safe}) Tj ET"


def _pdf_charset(text: str) -> str:
    return (
        text.replace("€", "EUR")
        .replace("–", "-")
        .replace("—", "-")
        .replace("“", '"')
        .replace("”", '"')
        .replace("’", "'")
    )


def _pdf_escape(text: str) -> str:
    encoded = text.encode("latin-1", "replace").decode("latin-1")
    return encoded.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _write_pdf(pages: list[list[str]]) -> bytes:
    objects: list[bytes] = []

    def add(obj: str | bytes) -> int:
        data = obj if isinstance(obj, bytes) else obj.encode("latin-1")
        objects.append(data)
        return len(objects)

    catalog_id = add("PLACEHOLDER")
    pages_id = add("PLACEHOLDER")
    font_regular_id = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_ids: list[int] = []
    for commands in pages:
        stream = "\n".join(commands).encode("latin-1", "replace")
        content_id = add(
            b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream"
        )
        page_id = add(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        )
        page_ids.append(page_id)

    objects[catalog_id - 1] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode("latin-1")
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1")

    output = BytesIO()
    output.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(output.tell())
        output.write(f"{index} 0 obj\n".encode("ascii"))
        output.write(obj)
        output.write(b"\nendobj\n")
    xref_offset = output.tell()
    output.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return output.getvalue()
