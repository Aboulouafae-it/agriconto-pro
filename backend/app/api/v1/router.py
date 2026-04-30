from fastapi import APIRouter

from app.analytics.api import analytics
from app.api.v1 import auth, document_requests, documents, expenses, farms, reports, sales, workdays, workers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(farms.router)
api_router.include_router(workers.router)
api_router.include_router(workdays.router)
api_router.include_router(expenses.router)
api_router.include_router(sales.router)
api_router.include_router(documents.router)
api_router.include_router(document_requests.router)
api_router.include_router(reports.router)
api_router.include_router(analytics.router)
