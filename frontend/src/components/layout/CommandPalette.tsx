/**
 * Raycast-style command palette (⌘K / Ctrl+K): navigation, quick actions,
 * and live global search across tasks, projects, notes and reading.
 */

import {
  BookOpen,
  CalendarClock,
  FileText,
  FolderKanban,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Plus,
  Sparkles,
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGeneratePlan, useSearch } from "@/api/hooks";
import type { SearchHit } from "@/api/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface PaletteContextValue {
  open: () => void;
  openNewTask: () => void;
  newTaskOpen: boolean;
  setNewTaskOpen: (open: boolean) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  open: () => undefined,
  openNewTask: () => undefined,
  newTaskOpen: false,
  setNewTaskOpen: () => undefined,
});

// eslint-disable-next-line react-refresh/only-export-components
export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext);
}

const HIT_ICONS: Record<SearchHit["kind"], typeof FileText> = {
  task: ListTodo,
  project: FolderKanban,
  note: FileText,
  reading: BookOpen,
};

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const generatePlan = useGeneratePlan();
  const { data: hits } = useSearch(query);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (
        event.key.toLowerCase() === "c" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target as HTMLElement | null)?.isContentEditable
      ) {
        event.preventDefault();
        setNewTaskOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<PaletteContextValue>(
    () => ({
      open: () => setOpen(true),
      openNewTask: () => setNewTaskOpen(true),
      newTaskOpen,
      setNewTaskOpen,
    }),
    [newTaskOpen],
  );

  function go(path: string) {
    setOpen(false);
    setQuery("");
    navigate(path);
  }

  function goToHit(hit: SearchHit) {
    switch (hit.kind) {
      case "task":
        go(`/board?task=${hit.id}`);
        break;
      case "project":
        go(`/projects/${hit.id}`);
        break;
      case "note":
        go(`/notes?note=${hit.id}`);
        break;
      case "reading":
        go("/learning");
        break;
    }
  }

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search or run a command…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {query.trim().length === 0 && (
            <>
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setNewTaskOpen(true);
                  }}
                >
                  <Plus />
                  New task
                  <span className="ml-auto text-xs text-muted-foreground">C</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    generatePlan.mutate({});
                    navigate("/today");
                  }}
                >
                  <Sparkles />
                  Plan my day
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Go to">
                <CommandItem onSelect={() => go("/")}>
                  <LayoutDashboard /> Dashboard
                </CommandItem>
                <CommandItem onSelect={() => go("/today")}>
                  <CalendarClock /> My Day
                </CommandItem>
                <CommandItem onSelect={() => go("/board")}>
                  <Kanban /> Board
                </CommandItem>
                <CommandItem onSelect={() => go("/projects")}>
                  <FolderKanban /> Projects
                </CommandItem>
                <CommandItem onSelect={() => go("/notes")}>
                  <FileText /> Notes
                </CommandItem>
                <CommandItem onSelect={() => go("/learning")}>
                  <GraduationCap /> Learning
                </CommandItem>
              </CommandGroup>
            </>
          )}
          {query.trim().length > 0 && hits && hits.length > 0 && (
            <CommandGroup heading="Results">
              {hits.map((hit) => {
                const Icon = HIT_ICONS[hit.kind];
                return (
                  <CommandItem key={`${hit.kind}-${hit.id}`} onSelect={() => goToHit(hit)}>
                    <Icon />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{hit.title}</div>
                      {hit.snippet && (
                        <div className="truncate text-xs text-muted-foreground">{hit.snippet}</div>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {hit.kind}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </PaletteContext.Provider>
  );
}
