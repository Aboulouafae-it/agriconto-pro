from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.reports.components.formatting import date_it, h, money

DISCLAIMER = (
    "Questo report e un documento gestionale interno generato da AgriConto Pro. "
    "Non sostituisce il commercialista, il consulente del lavoro, le dichiarazioni fiscali, "
    "IVA, INPS, INAIL o altri adempimenti ufficiali. I dati devono essere verificati da un "
    "professionista abilitato."
)


@dataclass(frozen=True)
class Column:
    key: str
    label: str
    kind: str = "text"


def stylesheet() -> str:
    path = Path(__file__).resolve().parents[1] / "styles" / "report_base.css"
    return path.read_text(encoding="utf-8")


def document(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{h(title)} - AgriConto Pro</title>
  <style>{stylesheet()}</style>
</head>
<body>{body}</body>
</html>"""


def brand() -> str:
    return """
<div class="brand">
  <div class="brand-mark">
    <svg width="24" height="24" viewBox="0 0 512 512" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M128 337C190 337 233 303 248 250C190 247 141 271 120 319C117 327 120 337 128 337Z" fill="#7BC99A"/>
      <path d="M384 337C322 337 279 303 264 250C322 247 371 271 392 319C395 327 392 337 384 337Z" fill="#2F6F53"/>
      <path d="M256 353V161" stroke="white" stroke-width="34" stroke-linecap="round"/>
      <path d="M207 191C225 156 249 137 282 126C291 123 300 130 298 140C289 183 263 212 218 222C209 224 202 199 207 191Z" fill="white"/>
      <path d="M185 372H327" stroke="white" stroke-width="34" stroke-linecap="round"/>
    </svg>
  </div>
  <div>
    <div>AgriConto Pro</div>
    <div class="small muted">Piattaforma agricola professionale</div>
  </div>
</div>"""


def cover(
    *,
    title: str,
    subtitle: str,
    farm_name: str,
    period: str,
    report_id: str,
    generated_at: str,
    generated_by: str,
    qr_svg: str,
    checksum: str,
    status: str = "Generato",
) -> str:
    return f"""
<section class="sheet cover">
  <div class="brand-line">
    {brand()}
    <div class="small muted">Report ID<br><strong>{h(report_id)}</strong></div>
  </div>
  <div>
    <div class="eyebrow">Documento gestionale</div>
    <h1>{h(title)}</h1>
    <p class="subtitle">{h(subtitle)}</p>
    <div class="cover-grid">
      <div class="panel soft-panel">
        {metadata_block([
            ("Azienda agricola", farm_name),
            ("Periodo", period),
            ("Generato da", generated_by),
            ("Generato il", generated_at),
            ("Stato export", status),
            ("Checksum", checksum[:24]),
        ])}
      </div>
      <div class="qr-box">
        {qr_svg}
        <div class="small muted">Riferimento verifica QR<br><strong>{h(checksum[:16])}</strong></div>
      </div>
    </div>
  </div>
  <div class="disclaimer">{h(DISCLAIMER)}</div>
</section>"""


def page_header(title: str, farm_name: str, period: str, report_id: str, generated_at: str) -> str:
    return f"""
<header class="report-header">
  {brand()}
  <div class="small muted">
    <strong>{h(title)}</strong><br>
    {h(farm_name)} | {h(period)}<br>
    ID {h(report_id)} | {h(generated_at)}
  </div>
</header>"""


def metadata_block(rows: Iterable[tuple[str, Any]]) -> str:
    items = "".join(f"<dt>{h(label)}</dt><dd>{h(value)}</dd>" for label, value in rows)
    return f"<dl class=\"metadata\">{items}</dl>"


def kpi_grid(items: Iterable[tuple[str, Any, str]]) -> str:
    cards = "".join(
        f"<div class=\"kpi-card\"><div class=\"kpi-label\">{h(label)}</div>"
        f"<div class=\"kpi-value\">{money(value) if kind == 'money' else h(value)}</div></div>"
        for label, value, kind in items
    )
    return f"<div class=\"kpi-grid\">{cards}</div>"


def badge(label: str, tone: str = "info") -> str:
    return f"<span class=\"badge {h(tone)}\">{h(label)}</span>"


def data_table(columns: list[Column], rows: list[dict[str, Any]], empty: str = "Nessun dato disponibile.") -> str:
    if not rows:
        return f"<div class=\"panel soft-panel muted\">{h(empty)}</div>"
    head = "".join(f"<th class=\"{'num' if col.kind == 'money' else ''}\">{h(col.label)}</th>" for col in columns)
    body_rows = []
    for row in rows:
        cells = []
        for col in columns:
            value = row.get(col.key)
            css = "num" if col.kind == "money" else ""
            if col.kind == "money":
                rendered = money(value)
            elif col.kind == "date":
                rendered = date_it(value)
            elif col.kind == "badge":
                rendered = badge(str(value or "Da verificare"), _tone_for(str(value or "")))
            else:
                rendered = h(value if value not in (None, "") else "-")
            cells.append(f"<td class=\"{css}\">{rendered}</td>")
        body_rows.append("<tr>" + "".join(cells) + "</tr>")
    return f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(body_rows)}</tbody></table>"


def checklist(items: Iterable[str]) -> str:
    rows = "".join(f"<tr><td style=\"width:24px\">□</td><td>{h(item)}</td></tr>" for item in items)
    return f"<table><tbody>{rows}</tbody></table>"


def disclaimer() -> str:
    return f"<div class=\"disclaimer\">{h(DISCLAIMER)}</div>"


def _tone_for(label: str) -> str:
    normalized = label.lower()
    if any(word in normalized for word in ["pagato", "saldato", "presente", "positiva", "completo"]):
        return "success"
    if any(word in normalized for word in ["mancante", "critica", "non pagato", "da pagare", "alta"]):
        return "danger"
    if any(word in normalized for word in ["monitorare", "parziale", "media", "verificare"]):
        return "warning"
    return "info"
