from pathlib import Path

import pytest

from app.core.exceptions import ValidationError
from app.storage.local import LocalDocumentStorage


def test_local_storage_uses_opaque_non_original_name(tmp_path: Path) -> None:
    storage = LocalDocumentStorage(root=str(tmp_path))
    stored = storage.save("../invoice-secret.pdf", b"hello")

    assert stored.storage_key == stored.stored_file_name
    assert "invoice-secret" not in stored.storage_key
    assert "/" not in stored.storage_key
    assert storage.read(stored.storage_key) == b"hello"


@pytest.mark.parametrize("key", ["../secret.pdf", "nested/file.pdf", "..", "."])
def test_local_storage_rejects_path_traversal_keys(tmp_path: Path, key: str) -> None:
    storage = LocalDocumentStorage(root=str(tmp_path))

    with pytest.raises(ValidationError):
        storage.read(key)

