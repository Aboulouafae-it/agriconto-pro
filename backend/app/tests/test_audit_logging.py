from types import SimpleNamespace
from uuid import uuid4

from app.core.audit import AuditContext, audit_create, audit_custom_event, audit_delete, audit_update


class FakeDb:
    def __init__(self):
        self.rows = []

    def add(self, row):
        self.rows.append(row)


class FakeEntity:
    __table__ = SimpleNamespace(
        columns=[
            SimpleNamespace(name="id"),
            SimpleNamespace(name="farm_id"),
            SimpleNamespace(name="password_hash"),
            SimpleNamespace(name="name"),
        ]
    )

    def __init__(self):
        self.id = uuid4()
        self.farm_id = uuid4()
        self.password_hash = "secret"
        self.name = "Record"


def test_audit_create_adds_redacted_log_row() -> None:
    db = FakeDb()
    entity = FakeEntity()
    user_id = uuid4()

    audit_create(db, entity.farm_id, user_id, entity)

    assert len(db.rows) == 1
    row = db.rows[0]
    assert row.farm_id == entity.farm_id
    assert row.user_id == user_id
    assert row.action == "create"
    assert row.entity_type == "FakeEntity"
    assert row.entity_id == entity.id
    assert "password_hash" not in row.new_value


def test_audit_update_adds_old_and_new_values() -> None:
    db = FakeDb()
    entity = FakeEntity()
    user_id = uuid4()
    old_value = {"name": "Old", "token": "secret-token"}

    entity.name = "New"
    audit_update(db, entity.farm_id, user_id, entity, old_value)

    row = db.rows[0]
    assert row.action == "update"
    assert row.old_value["name"] == "Old"
    assert row.old_value["token"] == "[REDACTED]"
    assert row.new_value["name"] == "New"


def test_audit_delete_adds_old_value_only() -> None:
    db = FakeDb()
    entity = FakeEntity()

    audit_delete(db, entity.farm_id, uuid4(), entity)

    row = db.rows[0]
    assert row.action == "delete"
    assert row.old_value["name"] == "Record"
    assert row.new_value is None


def test_audit_custom_event_records_context_and_redacts_document_content() -> None:
    db = FakeDb()
    farm_id = uuid4()
    user_id = uuid4()
    entity_id = uuid4()

    audit_custom_event(
        db,
        farm_id,
        user_id,
        "download",
        "Document",
        entity_id,
        new_value={"content": b"private", "title": "Invoice"},
        context=AuditContext(ip_address="127.0.0.1", user_agent="pytest"),
    )

    row = db.rows[0]
    assert row.action == "download"
    assert row.ip_address == "127.0.0.1"
    assert row.user_agent == "pytest"
    assert row.new_value["content"] == "[REDACTED]"
    assert row.new_value["title"] == "Invoice"

