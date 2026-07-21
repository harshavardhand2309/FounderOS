"""FastAPI application factory and entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.infrastructure.db import create_db_and_tables
from app.presentation.api.routes import api_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.debug)
    create_db_and_tables()
    logger.info("Database ready at %s", settings.database_url)

    scheduler = None
    watcher = None
    if settings.scheduler_enabled:
        from app.infrastructure.scheduler import build_scheduler

        scheduler = build_scheduler(settings)
        scheduler.start()
        logger.info("Background scheduler started")
    if settings.watch_directory:
        from app.infrastructure.files.watcher import start_note_watcher

        watcher = start_note_watcher(settings.watch_directory)
        logger.info("Watching notes directory: %s", settings.watch_directory)

    yield

    if scheduler is not None:
        scheduler.shutdown(wait=False)
    if watcher is not None:
        watcher.stop()
        watcher.join(timeout=5)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
