"""Dashboard, search and preferences endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.infrastructure.llm.base import LLMError
from app.presentation.api.deps import (
    DashboardServiceDep,
    PrefsRepoDep,
    SearchServiceDep,
    SemanticIndexDep,
)
from app.presentation.schemas.misc import (
    DashboardOverviewRead,
    PrefsRead,
    PrefsUpdate,
    ReindexResultRead,
    SearchHitRead,
    SemanticStatusRead,
    TodaySummaryRead,
)

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/overview", response_model=DashboardOverviewRead)
def dashboard_overview(service: DashboardServiceDep) -> DashboardOverviewRead:
    o = service.overview()
    return DashboardOverviewRead(
        today=TodaySummaryRead(**o.today.__dict__),
        total_remaining_minutes=o.total_remaining_minutes,
        burn_rate_minutes_per_day=o.burn_rate_minutes_per_day,
        projected_completion=o.projected_completion,
        overloaded_today=o.overloaded_today,
        overload_ratio=o.overload_ratio,
        open_tasks=o.open_tasks,
        blocked_tasks=o.blocked_tasks,
        overdue_tasks=o.overdue_tasks,
        done_this_week=o.done_this_week,
        velocity_tasks_per_day=o.velocity_tasks_per_day,
        avg_knowledge_score=o.avg_knowledge_score,
        reading_in_progress=o.reading_in_progress,
        reviews_due=o.reviews_due,
        focus_distribution=o.focus_distribution,
    )


@router.get("/dashboard/charts")
def dashboard_charts(service: DashboardServiceDep) -> dict:
    return service.charts()


@router.get("/search", response_model=list[SearchHitRead])
def search(
    service: SearchServiceDep,
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=30, ge=1, le=100),
) -> list[SearchHitRead]:
    return [SearchHitRead(**hit.__dict__) for hit in service.search(q, limit=limit)]


@router.get("/search/semantic/status", response_model=SemanticStatusRead)
def semantic_status(index: SemanticIndexDep) -> SemanticStatusRead:
    return SemanticStatusRead(**index.status())


@router.post("/search/reindex", response_model=ReindexResultRead)
def semantic_reindex(index: SemanticIndexDep) -> ReindexResultRead:
    try:
        return ReindexResultRead(**index.reindex())
    except LLMError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Semantic reindex unavailable: {exc}. Pull an embedding model "
                "(`ollama pull nomic-embed-text`) or set FOUNDEROS_EMBEDDING_PROVIDER."
            ),
        ) from None


@router.get("/prefs", response_model=PrefsRead)
def get_prefs(repo: PrefsRepoDep) -> PrefsRead:
    return PrefsRead.model_validate(repo.get())


@router.put("/prefs", response_model=PrefsRead)
def update_prefs(payload: PrefsUpdate, repo: PrefsRepoDep) -> PrefsRead:
    prefs = repo.get()
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prefs, field, value)
    return PrefsRead.model_validate(repo.save(prefs))
