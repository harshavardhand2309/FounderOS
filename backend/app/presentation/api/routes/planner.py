from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException

from app.domain.entities import utcnow
from app.presentation.api.deps import PlannerServiceDep
from app.presentation.schemas.misc import (
    DayPlanRead,
    PlanEntryRead,
    PlanEntryUpdate,
    PlanGenerateRequest,
)

router = APIRouter(prefix="/planner", tags=["planner"])


@router.get("/today", response_model=DayPlanRead | None)
def today(service: PlannerServiceDep) -> DayPlanRead | None:
    plan = service.get_plan(utcnow().date())
    return DayPlanRead.model_validate(plan) if plan else None


@router.get("/{plan_date}", response_model=DayPlanRead | None)
def by_date(plan_date: date, service: PlannerServiceDep) -> DayPlanRead | None:
    plan = service.get_plan(plan_date)
    return DayPlanRead.model_validate(plan) if plan else None


@router.post("/generate", response_model=DayPlanRead)
def generate(payload: PlanGenerateRequest, service: PlannerServiceDep) -> DayPlanRead:
    plan = service.generate(
        payload.plan_date or utcnow().date(),
        available_minutes=payload.available_minutes,
    )
    return DayPlanRead.model_validate(plan)


@router.post("/rollover")
def rollover(service: PlannerServiceDep) -> dict[str, int]:
    return {"moved": service.rollover()}


@router.patch("/entries/{entry_id}", response_model=PlanEntryRead)
def update_entry(entry_id: str, payload: PlanEntryUpdate, service: PlannerServiceDep) -> PlanEntryRead:
    entry = service.update_entry(entry_id, status=payload.status, locked=payload.locked)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return PlanEntryRead.model_validate(entry)
