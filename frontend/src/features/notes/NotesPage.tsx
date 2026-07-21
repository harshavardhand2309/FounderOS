import { FileText, FolderInput, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useCreateNote,
  useDeleteNote,
  useNote,
  useNotes,
  useProjects,
  useUpdateNote,
} from "@/api/hooks";
import type { NoteKind } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteEditor } from "@/features/notes/NoteEditor";
import { cn, formatDate } from "@/lib/utils";

const KIND_LABELS: Record<NoteKind, string> = {
  research: "Research",
  summary: "Summary",
  paper_review: "Paper review",
  book_notes: "Book notes",
  decision_log: "Decision log",
  adr: "ADR",
  meeting: "Meeting",
  technical: "Technical",
};

export function NotesPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("note");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const { data: notes, isLoading } = useNotes(
    kindFilter === "all" ? undefined : { kind: kindFilter },
  );
  const { data: selected } = useNote(selectedId);
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const projectName = useMemo(
    () => new Map(projects?.map((p) => [p.id, p.name]) ?? []),
    [projects],
  );

  function select(id: string | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id === null) next.delete("note");
        else next.set("note", id);
        return next;
      },
      { replace: true },
    );
  }

  function newNote(kind: NoteKind = "research") {
    createNote.mutate(
      { title: "Untitled note", kind },
      { onSuccess: (note) => select(note.id) },
    );
  }

  return (
    <div className="flex h-full">
      {/* List pane */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="flex items-center gap-2 border-b p-3">
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => newNote()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading &&
            Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="mb-2 h-16" />)}
          {notes?.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notes yet. Capture research, decisions and learnings.
            </div>
          )}
          {notes?.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => select(note.id)}
              className={cn(
                "mb-1.5 w-full rounded-md border border-transparent p-2.5 text-left transition-colors hover:bg-accent",
                selectedId === note.id && "border-border bg-accent",
              )}
            >
              <div className="flex items-center gap-2">
                {note.source_path ? (
                  <FolderInput className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-sm font-medium">{note.title}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {KIND_LABELS[note.kind]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(note.updated_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a note or create a new one.</p>
            <Button variant="secondary" size="sm" onClick={() => newNote()}>
              <Plus className="h-4 w-4" /> New note
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <Input
                key={selected.id}
                defaultValue={selected.title}
                disabled={selected.source_path !== null}
                className="h-8 border-transparent px-0 text-base font-semibold shadow-none focus-visible:border-input focus-visible:px-3"
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== selected.title)
                    updateNote.mutate({ id: selected.id, changes: { title: value } });
                }}
              />
              <Select
                value={selected.kind}
                onValueChange={(v) =>
                  updateNote.mutate({ id: selected.id, changes: { kind: v as NoteKind } })
                }
              >
                <SelectTrigger className="h-8 w-36 shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selected.project_id ?? "none"}
                onValueChange={(v) =>
                  updateNote.mutate({
                    id: selected.id,
                    changes: { project_id: v === "none" ? null : v },
                  })
                }
              >
                <SelectTrigger className="h-8 w-40 shrink-0 text-xs">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Delete note"
                onClick={() => {
                  if (!window.confirm("Delete this note?")) return;
                  deleteNote.mutate(selected.id, { onSuccess: () => select(null) });
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            {selected.project_id && (
              <div className="border-b px-4 py-1.5 text-xs text-muted-foreground">
                Project: {projectName.get(selected.project_id) ?? "…"}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <NoteEditor key={selected.id} note={selected} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
