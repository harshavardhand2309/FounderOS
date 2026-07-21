import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PaletteProvider } from "@/components/layout/CommandPalette";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Skeleton, TooltipProvider } from "@/components/ui/misc";
import { BoardPage } from "@/features/kanban/BoardPage";
import { PlannerPage } from "@/features/planner/PlannerPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

// Heavy modules (Recharts, TipTap) load on demand.
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const NotesPage = lazy(() =>
  import("@/features/notes/NotesPage").then((m) => ({ default: m.NotesPage })),
);
const ReadingPage = lazy(() =>
  import("@/features/learning/ReadingPage").then((m) => ({ default: m.ReadingPage })),
);

function PageFallback() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}

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
              <Suspense fallback={<PageFallback />}>
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
              </Suspense>
            </PaletteProvider>
          </BrowserRouter>
          <Toaster theme="dark" position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
