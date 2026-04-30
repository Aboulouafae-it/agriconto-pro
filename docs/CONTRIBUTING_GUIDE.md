# Contributing Guide

This guide expands the root [CONTRIBUTING.md](../CONTRIBUTING.md).

## Before You Start

- Read [SECURITY.md](../SECURITY.md).
- Read [docs/ARCHITECTURE.md](ARCHITECTURE.md).
- Do not commit secrets, `.env` files or real farm data.

## Branches

- `feature/<topic>` for new functionality.
- `fix/<topic>` for defects.
- `docs/<topic>` for documentation.
- `security/<topic>` for hardening work.

## Commit Style

Use clear imperative commit messages:

- `fix: prevent cross-farm document access`
- `docs: clarify desktop packaging`
- `feat: add expense category filter`

## Pull Requests

Pull requests should describe:

- what changed;
- why it changed;
- security impact;
- tests run;
- screenshots for UI changes.

## Backend Standards

- Keep routes thin.
- Use services/repositories for business logic and data access.
- Validate input with Pydantic.
- Preserve farm membership checks.
- Add audit logs for sensitive writes and exports.

## Frontend Standards

- Keep Italian UI labels.
- Show friendly user errors.
- Do not rely on frontend permissions for security.
- Add loading, empty and error states.

## Documentation Standards

- Mark planned features as planned.
- Do not claim legal, tax or payroll compliance.
- Keep README concise and move details to `docs/`.
