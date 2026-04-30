from app.main import app


def route_methods(path: str) -> set[str]:
    methods: set[str] = set()
    for route in app.routes:
        if getattr(route, "path", None) == path:
            methods.update(getattr(route, "methods", set()))
    return methods


def test_required_auth_routes_exist() -> None:
    assert "POST" in route_methods("/api/v1/auth/register")
    assert "POST" in route_methods("/api/v1/auth/login")
    assert "GET" in route_methods("/api/v1/auth/me")


def test_required_farm_routes_exist() -> None:
    assert "POST" in route_methods("/api/v1/farms")
    assert "GET" in route_methods("/api/v1/farms")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}")
    assert "PATCH" in route_methods("/api/v1/farms/{farm_id}")


def test_required_worker_routes_exist() -> None:
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/workers")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/workers")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/workers/{worker_id}")
    assert "PATCH" in route_methods("/api/v1/farms/{farm_id}/workers/{worker_id}")
    assert "DELETE" in route_methods("/api/v1/farms/{farm_id}/workers/{worker_id}")


def test_required_workday_routes_exist() -> None:
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/workdays")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/workdays")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/workdays/{workday_id}")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/workdays/{workday_id}/entries")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/workdays/{workday_id}/close")


def test_required_financial_document_and_report_routes_exist() -> None:
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/expenses")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/expenses")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/expenses/{expense_id}")
    assert "PATCH" in route_methods("/api/v1/farms/{farm_id}/expenses/{expense_id}")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/sales")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/sales")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/sales/{sale_id}")
    assert "PATCH" in route_methods("/api/v1/farms/{farm_id}/sales/{sale_id}")
    assert "POST" in route_methods("/api/v1/farms/{farm_id}/documents/upload")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/documents")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/documents/{document_id}/download")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/monthly")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/workers")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/crops")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/missing-documents")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/accountant-pack")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/expenses")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/sales")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/annual")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/document-index")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/audit-summary")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/reports/{report_type}/pdf")


def test_required_analytics_routes_exist() -> None:
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/overview")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/financial")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/crops")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/fields")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/labor")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/expenses")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/sales")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/documents")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/comparison")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/advanced-metrics")
    assert "GET" in route_methods("/api/v1/farms/{farm_id}/analytics/tables")
