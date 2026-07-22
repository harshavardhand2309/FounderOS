from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Response

from app.core.config import get_settings
from app.domain.entities import DayPlan, utcnow
from app.domain.enums import PlanEntryKind
from app.presentation.api.deps import PlannerServiceDep, SprintServiceDep
from app.presentation.schemas.misc import (
    DayPlanRead,
    PlanEntryRead,
    PlanEntryUpdate,
    PlanGenerateRequest,
    SprintAcceptRequest,
    SprintAcceptResult,
    SprintProposalRead,
    SprintProposeRequest,
)

router = APIRouter(prefix="/planner", tags=["planner"])


def _ics_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _plan_to_ics(plan: DayPlan, timezone: str) -> str:
    """Render a day plan as an iCalendar file so it lands on the user's
    real calendar (Google/Apple/Outlook import or subscription)."""
    day = plan.plan_date.strftime("%Y%m%d")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FounderOS//Day Plan//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    stamp = utcnow().strftime("%Y%m%dT%H%M%SZ")
    for entry in plan.entries:
        start_h, start_m = divmod(entry.start_minute, 60)
        end_minute = entry.start_minute + entry.duration_minutes
        end_h, end_m = divmod(end_minute, 60)
        emoji = {
            PlanEntryKind.FOCUS: "🎯",
            PlanEntryKind.LEARNING: "📚",
            PlanEntryKind.BREAK: "☕",
            PlanEntryKind.BUFFER: "🛡",
        }.get(entry.kind, "")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{entry.id}@founderos.local",
            f"DTSTAMP:{stamp}",
            f"DTSTART;TZID={timezone}:{day}T{start_h:02d}{start_m:02d}00",
            f"DTEND;TZID={timezone}:{day}T{end_h:02d}{end_m:02d}00",
            f"SUMMARY:{_ics_escape(f'{emoji} {entry.title}'.strip())}",
            f"CATEGORIES:{entry.kind.value.upper()}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


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


@router.get("/{plan_date}/calendar.ics")
def plan_calendar(plan_date: date, service: PlannerServiceDep) -> Response:
    plan = service.get_plan(plan_date)
    if plan is None:
        raise HTTPException(status_code=404, detail="No plan for that date — generate one first")
    ics = _plan_to_ics(plan, get_settings().timezone)
    return Response(
        content=ics,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="founderos-{plan_date}.ics"'},
    )


@router.post("/sprint/propose", response_model=SprintProposalRead)
def propose_sprint(payload: SprintProposeRequest, service: SprintServiceDep) -> SprintProposalRead:
    return SprintProposalRead(**service.propose(payload.week_start))


@router.post("/sprint/accept", response_model=SprintAcceptResult)
def accept_sprint(payload: SprintAcceptRequest, service: SprintServiceDep) -> SprintAcceptResult:
    try:
        return SprintAcceptResult(**service.accept(payload.week_start, payload.task_ids))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None


@router.patch("/entries/{entry_id}", response_model=PlanEntryRead)
def update_entry(entry_id: str, payload: PlanEntryUpdate, service: PlannerServiceDep) -> PlanEntryRead:
    entry = service.update_entry(entry_id, status=payload.status, locked=payload.locked)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return PlanEntryRead.model_validate(entry)
