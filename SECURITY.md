# Security Policy

AgriConto Pro handles sensitive farm, accounting, worker and document data. Please do not disclose suspected vulnerabilities publicly.

## Supported Versions

| Version | Status |
| --- | --- |
| `main` | MVP under active development |
| `0.1.x` | Development builds only |

## Reporting a Vulnerability

Open a private security advisory on GitHub if available, or contact the maintainer privately before publishing technical details.

Please include:

- affected area;
- steps to reproduce;
- expected impact;
- whether authentication is required;
- any relevant logs with secrets removed.

## Do Not Share Publicly

- Real passwords, tokens, JWT secrets or `.env` files.
- Private farm, worker, customer, supplier, invoice or document data.
- Exploit code for active vulnerabilities before a fix is available.

## Security Expectations

Changes must not weaken authentication, RBAC, farm isolation, document access controls or audit logging. Frontend checks are never a substitute for backend authorization.

For the full security model, see [docs/SECURITY.md](docs/SECURITY.md).
