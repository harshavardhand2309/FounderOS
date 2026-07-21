"""Watchdog-based markdown vault watcher.

Watches a user-configured directory of markdown files and mirrors them into
the notes table (``Note.source_path`` marks file-backed notes), so external
Obsidian-style vaults stay searchable inside FounderOS.
"""

from __future__ import annotations

from pathlib import Path

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from app.core.logging import get_logger

logger = get_logger("watcher")

MARKDOWN_SUFFIXES = {".md", ".mdx", ".markdown"}


class MarkdownNoteHandler(FileSystemEventHandler):
    def _is_markdown(self, path_str: str) -> bool:
        return Path(path_str).suffix.lower() in MARKDOWN_SUFFIXES

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory and self._is_markdown(str(event.src_path)):
            self._sync(str(event.src_path))

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory and self._is_markdown(str(event.src_path)):
            self._sync(str(event.src_path))

    def on_deleted(self, event: FileSystemEvent) -> None:
        if not event.is_directory and self._is_markdown(str(event.src_path)):
            self._remove(str(event.src_path))

    def _sync(self, path_str: str) -> None:
        try:
            from app.application.services.note_sync import sync_note_from_file

            sync_note_from_file(Path(path_str))
        except ImportError:
            logger.debug("note_sync service not available yet; ignoring %s", path_str)
        except Exception:  # never let a bad file kill the observer thread
            logger.exception("Failed to sync note from %s", path_str)

    def _remove(self, path_str: str) -> None:
        try:
            from app.application.services.note_sync import remove_note_for_file

            remove_note_for_file(Path(path_str))
        except ImportError:
            logger.debug("note_sync service not available yet; ignoring %s", path_str)
        except Exception:
            logger.exception("Failed to remove note for %s", path_str)


def start_note_watcher(directory: str) -> Observer:
    path = Path(directory).expanduser()
    path.mkdir(parents=True, exist_ok=True)
    observer = Observer()
    observer.schedule(MarkdownNoteHandler(), str(path), recursive=True)
    observer.daemon = True
    observer.start()
    return observer
