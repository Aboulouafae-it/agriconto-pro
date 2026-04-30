# Contributing

Thanks for helping improve AgriConto Pro. This project is an MVP under active development, but it is designed as a serious security-aware product.

## Workflow

1. Fork the repository.
2. Create a branch:
   - `feature/short-description`
   - `fix/short-description`
   - `docs/short-description`
3. Keep commits focused and descriptive.
4. Open a pull request using the template.

## Development Setup

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
python scripts/seed_demo.py
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Docker:

```bash
docker compose up --build
```

## Tests

```bash
cd backend
pytest app/tests
```

```bash
cd frontend
npm run build
npm run test:e2e
```

## Documentation Standards

- Use clear English.
- Keep Italian product terms where useful: Commercialista, Consulente del lavoro, Pacchetto Commercialista, Titolare.
- Separate implemented features from planned features.
- Do not claim official tax, payroll or legal compliance.

## Security Rules

- Never commit `.env` files, secrets, tokens or real customer data.
- Do not bypass authentication.
- Do not weaken RBAC.
- Do not introduce cross-farm data leakage.
- Do not expose internal document storage paths.
- Add or update tests for permission-sensitive changes.
