import { Plus, Search } from "lucide-react";
import { Outlet } from "react-router-dom";
import { usePalette } from "@/components/layout/CommandPalette";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { TaskCreateDialog } from "@/features/kanban/TaskCreateDialog";

export function AppShell() {
  const { open, openNewTask, newTaskOpen, setNewTaskOpen } = usePalette();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
          <button
            type="button"
            onClick={open}
            className="flex h-8 w-72 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <Search className="h-3.5 w-3.5" />
            Search…
            <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
          </button>
          <Button size="sm" onClick={openNewTask}>
            <Plus className="h-4 w-4" />
            New task
            <kbd className="rounded border border-primary-foreground/30 px-1 font-mono text-[10px] opacity-80">
              C
            </kbd>
          </Button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <TaskCreateDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </div>
  );
}
