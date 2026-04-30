from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from html import escape
from typing import Any


def h(value: Any) -> str:
    return escape("" if value is None else str(value), quote=True)


def money(value: Any) -> str:
    amount = Decimal(str(value or 0))
    formatted = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{formatted} EUR"


def date_it(value: Any) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    text = str(value)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).strftime("%d/%m/%Y")
    except ValueError:
        return h(text)


def pct(value: Any) -> str:
    return f"{Decimal(str(value or 0)):.1f}%".replace(".", ",")

