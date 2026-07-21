"""API route registration.

Each module below owns one resource; ``api_router`` aggregates them under /api.
"""

from fastapi import APIRouter

from app.presentation.api.routes import health, misc, notes, planner, projects, reading, tasks

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(tasks.router)
api_router.include_router(projects.router)
api_router.include_router(planner.router)
api_router.include_router(notes.router)
api_router.include_router(reading.router)
api_router.include_router(misc.router)
