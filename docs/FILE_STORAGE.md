# File Storage

Document storage is abstracted behind a storage service. The first implementation is local storage; later implementations can use S3-compatible object storage.

Documents may include invoices, receipts, contracts, worker documents, photos and accountant-requested files.

## Storage Model

The database stores metadata in `documents`:

- `farm_id`
- `related_entity_type`
- `related_entity_id`
- `document_type`
- `original_file_name`
- `stored_file_name`
- `storage_key`
- `mime_type`
- `size_bytes`
- `uploaded_by`
- `uploaded_at`
- `notes`

The file bytes are stored outside frontend/public folders. The frontend never receives raw filesystem paths.

## Upload Flow

1. User authenticates with the backend.
2. Backend verifies farm membership and role.
3. Backend validates optional related entity ownership.
4. Backend validates MIME type against an allow-list.
5. Backend validates file size.
6. Backend generates an opaque stored filename.
7. Backend stores file bytes through the storage abstraction.
8. Backend stores document metadata in PostgreSQL.
9. Backend writes an audit log for the upload.

Current upload limits:

- max size: 10 MiB
- allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `text/plain`

## Download Flow

1. User authenticates with the backend.
2. Backend verifies farm membership and role.
3. Backend loads document metadata and verifies `document.farm_id`.
4. Backend reads bytes using the opaque storage key.
5. Backend streams bytes from an authenticated endpoint.
6. Backend writes an audit log for the download.

The response uses a safe display filename. It does not reveal `storage_key` or local paths.

## Permissions

Default policy:

- `OWNER`: upload, list, read, download documents
- `ACCOUNTANT`: list, read, download documents
- `LABOR_CONSULTANT`: no unrelated document access by default
- `WORKER`: future self/shared document access only

## Path Traversal And Overwrite Protection

The local storage adapter:

- rejects keys containing `/` or `\`
- rejects `.` and `..`
- resolves paths under the configured storage root
- generates UUID-based stored names
- refuses overwrite collisions

Original filenames are never trusted for storage paths.

## Malware Scanning

Malware scanning is not implemented yet. The storage flow is designed so a scanner can be inserted between upload and document availability.

Future options:

- store uploaded files as `PENDING_SCAN`
- run ClamAV or a managed scanning service
- block download until scan status is clean
- audit scan failures

## Future S3 Migration

The S3-compatible storage implementation should preserve the same interface:

- `save`
- `read`
- `delete`

S3 rules:

- private bucket only
- object keys remain opaque
- no public-read objects
- short-lived signed URLs only after backend authorization
- server-side encryption enabled
- lifecycle policy for expired report exports

