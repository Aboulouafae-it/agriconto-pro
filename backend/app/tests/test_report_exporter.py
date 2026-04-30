from datetime import datetime, timezone
from uuid import uuid4

from app.reports.components.qr import checksum, qr_payload, verification_svg
from app.reports.report_exporter import REPORT_DEFINITIONS


def test_all_required_report_definitions_exist() -> None:
    assert {
        "monthly",
        "workers",
        "crops",
        "expenses",
        "sales",
        "missing-documents",
        "accountant-pack",
        "annual",
        "document-index",
        "audit-summary",
    }.issubset(REPORT_DEFINITIONS)


def test_qr_payload_does_not_embed_business_rows() -> None:
    farm_id = uuid4()
    report_id = uuid4()
    digest = checksum({"total_sales": 100, "worker": "redacted from qr"})
    payload = qr_payload(report_id, farm_id, datetime.now(timezone.utc), digest)

    assert payload.keys() == {"report_id", "farm_id", "generated_at", "checksum"}
    assert "total_sales" not in str(payload)
    assert "worker" not in str(payload)


def test_verification_svg_is_inline_and_deterministic() -> None:
    digest = checksum({"report": "monthly"})

    first = verification_svg(digest)
    second = verification_svg(digest)

    assert first == second
    assert "<svg" in first
    assert digest not in first

