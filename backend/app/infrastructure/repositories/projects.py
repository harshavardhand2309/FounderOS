"""Project, milestone and epic repositories."""

from __future__ import annotations

from sqlmodel import Session, col, select

from app.domain.entities import Epic, Milestone, Project, utcnow
from app.domain.enums import ProjectStatus


class ProjectRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, project_id: str) -> Project | None:
        return self._s.get(Project, project_id)

    def list(self, include_archived: bool = False) -> list[Project]:
        stmt = select(Project)
        if not include_archived:
            stmt = stmt.where(Project.status != ProjectStatus.ARCHIVED)
        stmt = stmt.order_by(col(Project.created_at))
        return list(self._s.exec(stmt).all())

    def add(self, project: Project) -> Project:
        self._s.add(project)
        self._s.commit()
        self._s.refresh(project)
        return project

    def save(self, project: Project) -> Project:
        project.updated_at = utcnow()
        self._s.add(project)
        self._s.commit()
        self._s.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        self._s.delete(project)
        self._s.commit()

    # Milestones -----------------------------------------------------------

    def milestones(self, project_id: str) -> list[Milestone]:
        stmt = (
            select(Milestone)
            .where(Milestone.project_id == project_id)
            .order_by(col(Milestone.sort_order), col(Milestone.due_date))
        )
        return list(self._s.exec(stmt).all())

    def get_milestone(self, milestone_id: str) -> Milestone | None:
        return self._s.get(Milestone, milestone_id)

    def add_milestone(self, milestone: Milestone) -> Milestone:
        self._s.add(milestone)
        self._s.commit()
        self._s.refresh(milestone)
        return milestone

    def save_milestone(self, milestone: Milestone) -> Milestone:
        self._s.add(milestone)
        self._s.commit()
        self._s.refresh(milestone)
        return milestone

    def delete_milestone(self, milestone: Milestone) -> None:
        self._s.delete(milestone)
        self._s.commit()

    # Epics ----------------------------------------------------------------

    def epics(self, project_id: str) -> list[Epic]:
        stmt = select(Epic).where(Epic.project_id == project_id).order_by(col(Epic.created_at))
        return list(self._s.exec(stmt).all())

    def get_epic(self, epic_id: str) -> Epic | None:
        return self._s.get(Epic, epic_id)

    def add_epic(self, epic: Epic) -> Epic:
        self._s.add(epic)
        self._s.commit()
        self._s.refresh(epic)
        return epic

    def delete_epic(self, epic: Epic) -> None:
        self._s.delete(epic)
        self._s.commit()
