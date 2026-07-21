"""Mirror watched markdown files into the notes table.

Called from the watchdog handler (infrastructure/files/watcher.py). Each
file becomes a Note with ``source_path`` set; re-saves update in place.
"""

from __future__ import annotations

from pathlib import Path

from app.core.logging import get_logger
from app.domain.entities import Note
from app.domain.enums import NoteKind
from app.infrastructure.db import session_scope
from app.infrastructure.repositories import NoteRepository

logger = get_logger("note_sync")


def _title_from(path: Path, content: str) -> str:
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip() or path.stem
    return path.stem


def sync_note_from_file(path: Path) -> None:
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        logger.warning("Cannot read %s: %s", path, exc)
        return

    source = str(path.resolve())
    with session_scope() as session:
        repo = NoteRepository(session)
        note = repo.by_source_path(source)
        if note is None:
            repo.add(
                Note(
                    title=_title_from(path, content),
                    kind=NoteKind.TECHNICAL,
                    content_md=content,
                    source_path=source,
                    tags=["vault"],
                )
            )
            logger.info("Imported note from %s", path.name)
        else:
            note.title = _title_from(path, content)
            note.content_md = content
            repo.save(note)


def remove_note_for_file(path: Path) -> None:
    source = str(path.resolve())
    with session_scope() as session:
        repo = NoteRepository(session)
        note = repo.by_source_path(source)
        if note is not None:
            repo.delete(note)
            logger.info("Removed note for deleted file %s", path.name)
