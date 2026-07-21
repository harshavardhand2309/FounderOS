import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PaletteProvider } from "@/components/layout/CommandPalette";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/misc";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { BoardPage } from "@/features/kanban/BoardPage";
import { ReadingPage } from "@/features/learning/ReadingPage";
import { NotesPage } from "@/features/notes/NotesPage";
import { PlannerPage } from "@/features/planner/PlannerPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
            <PaletteProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="today" element={<PlannerPage />} />
                  <Route path="board" element={<BoardPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                  <Route path="notes" element={<NotesPage />} />
                  <Route path="learning" element={<ReadingPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </PaletteProvider>
          </BrowserRouter>
          <Toaster theme="dark" position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
