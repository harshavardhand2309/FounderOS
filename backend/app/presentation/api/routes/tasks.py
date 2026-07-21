from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.domain.enums import TaskStatus
from app.presentation.api.deps import TaskServiceDep
from app.presentation.schemas.tasks import (
    BoardColumn,
    BoardRead,
    ChecklistRead,
    ChecklistUpdate,
    DependencyCreate,
    DependencyRead,
    MoveRequest,
    TaskCreate,
    TaskDetail,
    TaskRead,
    TaskUpdate,
    WorkLogRequest,
)
from app.application.services.task_service import CycleError

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
def list_tasks(
    service: TaskServiceDep,
    project_id: str | None = None,
    task_status: TaskStatus | None = Query(default=None, alias="status"),
    include_archived: bool = False,
) -> list[TaskRead]:
    tasks = service.list(
        project_id=project_id,
        statuses=[task_status] if task_status else None,
        include_archived=include_archived,
    )
    return [TaskRead.model_validate(t) for t in tasks]


@router.get("/board", response_model=BoardRead)
def board(service: TaskServiceDep, project_id: str | None = None) -> BoardRead:
    tasks = service.list(project_id=project_id, include_archived=True)
    by_status: dict[TaskStatus, list[TaskRead]] = {s: [] for s in TaskStatus}
    for task in tasks:
        by_status[task.status].append(TaskRead.model_validate(task))
    return BoardRead(
        columns=[BoardColumn(status=s, tasks=by_status[s]) for s in TaskStatus]
    )


@router.post("", response_model=TaskDetail, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, service: TaskServiceDep) -> TaskDetail:
    task = service.create(payload.model_dump())
    return _detail(service, task.id)


@router.get("/{task_id}", response_model=TaskDetail)
def get_task(task_id: str, service: TaskServiceDep) -> TaskDetail:
    if service.get(task_id) is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _detail(service, task_id)


@router.patch("/{task_id}", response_model=TaskDetail)
def update_task(task_id: str, payload: TaskUpdate, service: TaskServiceDep) -> TaskDetail:
    task = service.update(task_id, payload.model_dump(exclude_unset=True))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _detail(service, task_id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, service: TaskServiceDep) -> None:
    if not service.delete(task_id):
        raise HTTPException(status_code=404, detail="Task not found")


@router.post("/{task_id}/move", response_model=TaskRead)
def move_task(task_id: str, payload: MoveRequest, service: TaskServiceDep) -> TaskRead:
    task = service.move(task_id, payload.status, payload.before_sequence)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead.model_validate(task)


@router.post("/{task_id}/reestimate", response_model=TaskRead)
def reestimate(task_id: str, service: TaskServiceDep) -> TaskRead:
    task = service.reestimate(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead.model_validate(task)


@router.post("/{task_id}/work", response_model=TaskRead)
def log_work(task_id: str, payload: WorkLogRequest, service: TaskServiceDep) -> TaskRead:
    task = service.log_work(
        task_id,
        minutes=payload.minutes,
        deep_work=payload.deep_work,
        session_type=payload.session_type,
        note=payload.note,
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead.model_validate(task)


@router.get("/{task_id}/checklist", response_model=ChecklistRead)
def get_checklist(task_id: str, service: TaskServiceDep) -> ChecklistRead:
    checklist = service.get_checklist(task_id)
    if checklist is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return ChecklistRead.model_validate(checklist)


@router.patch("/{task_id}/checklist", response_model=ChecklistRead)
def update_checklist(
    task_id: str, payload: ChecklistUpdate, service: TaskServiceDep
) -> ChecklistRead:
    checklist = service.update_checklist(task_id, payload.model_dump(exclude_unset=True))
    if checklist is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return ChecklistRead.model_validate(checklist)


@router.post("/{task_id}/dependencies", response_model=DependencyRead, status_code=201)
def add_dependency(
    task_id: str, payload: DependencyCreate, service: TaskServiceDep
) -> DependencyRead:
    try:
        dep = service.add_dependency(task_id, payload.depends_on_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Task not found") from None
    except CycleError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    return DependencyRead.model_validate(dep)


@router.delete("/{task_id}/dependencies/{depends_on_id}", status_code=204)
def remove_dependency(task_id: str, depends_on_id: str, service: TaskServiceDep) -> None:
    if not service.remove_dependency(task_id, depends_on_id):
        raise HTTPException(status_code=404, detail="Dependency not found")


def _detail(service: TaskServiceDep, task_id: str) -> TaskDetail:
    task = service.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    checklist = service.get_checklist(task_id)
    detail = TaskDetail.model_validate(task)
    detail.checklist = ChecklistRead.model_validate(checklist) if checklist else None
    detail.dependencies = [
        DependencyRead.model_validate(d) for d in service.dependencies_of(task_id)
    ]
    detail.subtasks = [TaskRead.model_validate(t) for t in service.subtasks(task_id)]
    return detail
