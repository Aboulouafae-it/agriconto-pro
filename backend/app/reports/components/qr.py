from __future__ import annotations

import hashlib
import json
from datetime import datetime
from uuid import UUID


def checksum(payload: dict) -> str:
    stable = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def qr_payload(report_id: UUID, farm_id: UUID, generated_at: datetime, digest: str) -> dict[str, str]:
    return {
        "report_id": str(report_id),
        "farm_id": str(farm_id),
        "generated_at": generated_at.isoformat(),
        "checksum": digest[:24],
    }


def verification_svg(digest: str, size: int = 132) -> str:
    """Deterministic verification matrix.

    This is intentionally data-minimal: it visualizes a checksum reference and
    never embeds financial rows, worker details or document contents.
    """
    bits = bin(int(digest[:48], 16))[2:].zfill(192)
    cells = 12
    cell = size // cells
    rects = [f'<rect width="{size}" height="{size}" rx="10" fill="#ffffff"/>']
    anchors = [(0, 0), (8, 0), (0, 8)]
    for ax, ay in anchors:
        rects.append(f'<rect x="{ax * cell}" y="{ay * cell}" width="{cell * 4}" height="{cell * 4}" rx="3" fill="#14365d"/>')
        rects.append(f'<rect x="{(ax + 1) * cell}" y="{(ay + 1) * cell}" width="{cell * 2}" height="{cell * 2}" rx="2" fill="#ffffff"/>')
    index = 0
    for y in range(cells):
        for x in range(cells):
            if any(ax <= x < ax + 4 and ay <= y < ay + 4 for ax, ay in anchors):
                continue
            if bits[index % len(bits)] == "1":
                rects.append(f'<rect x="{x * cell}" y="{y * cell}" width="{cell}" height="{cell}" fill="#2f6f53"/>')
            index += 1
    return (
        f'<svg class="qr-svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}" '
        'role="img" aria-label="QR verifica report">'
        + "".join(rects)
        + "</svg>"
    )

