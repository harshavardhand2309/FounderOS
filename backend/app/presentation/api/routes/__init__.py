"""API route registration.

Each module below owns one resource; ``api_router`` aggregates them under /api.
"""

from fastapi import APIRouter

from app.presentation.api.routes import health

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
