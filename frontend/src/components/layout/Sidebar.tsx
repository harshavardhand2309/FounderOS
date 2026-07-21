import {
  CalendarClock,
  FolderKanban,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  Moon,
  NotebookPen,
  Settings,
  Sun,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useProjects } from "@/api/hooks";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Separator, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, shortcut: "G D" },
  { to: "/today", label: "My Day", icon: CalendarClock, shortcut: "G T" },
  { to: "/board", label: "Board", icon: Kanban, shortcut: "G B" },
  { to: "/projects", label: "Projects", icon: FolderKanban, shortcut: "G P" },
  { to: "/notes", label: "Notes", icon: NotebookPen, shortcut: "G N" },
  { to: "/learning", label: "Learning", icon: GraduationCap, shortcut: "G L" },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const { data: projects } = useProjects();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-card/50">
      <div className="flex h-12 items-center gap-2 px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
          F
        </div>
        <span className="text-sm font-semibold tracking-tight">FounderOS</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {projects && projects.length > 0 && (
          <>
            <div className="px-2.5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Projects
            </div>
            {projects.map((project) => (
              <NavLink
                key={project.id}
                to={`/projects/${project.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <Separator />
      <div className="flex items-center justify-between p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-foreground",
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="iconSm" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
