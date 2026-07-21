/**
 * Learning system: reading tracker with knowledge / understanding /
 * implementation scores and spaced revision reminders.
 */

import { BookOpen, Check, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCompleteReview,
  useCreateReading,
  useDeleteReading,
  useDueReviews,
  useProjects,
  useReadingList,
  useUpdateReading,
} from "@/api/hooks";
import type { ReadingItem, ReadingKind, ReadingStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Skeleton } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

const KIND_LABELS: Record<ReadingKind, string> = {
  paper: "Paper",
  book: "Book",
  article: "Article",
  docs: "Docs",
  course: "Course",
  video: "Video",
};

const STATUS_COLUMNS: { status: ReadingStatus; label: string }[] = [
  { status: "queued", label: "Queue" },
  { status: "reading", label: "Reading" },
  { status: "completed", label: "Completed" },
];

function ScoreControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-[hsl(var(--primary))]"
      />
    </div>
  );
}

function ReadingCard({ item }: { item: ReadingItem }) {
  const updateReading = useUpdateReading();
  const deleteReading = useDeleteReading();

  function patch(changes: Parameters<typeof updateReading.mutate>[0]["changes"]) {
    updateReading.mutate({ id: item.id, changes });
  }

  return (
    <Card>
      <CardContent className="space-y-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{item.title}</div>
            {item.author && <div className="truncate text-xs text-muted-foreground">{item.author}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {item.url && (
              <Button variant="ghost" size="iconSm" asChild aria-label="Open link">
                <a href={item.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Delete"
              onClick={() => deleteReading.mutate(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{KIND_LABELS[item.kind]}</Badge>
          <Select value={item.status} onValueChange={(v) => patch({ status: v as ReadingStatus })}>
            <SelectTrigger className="h-6 w-28 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {item.status === "reading" && (
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{item.progress_pct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={item.progress_pct}
              onChange={(e) => patch({ progress_pct: Number(e.target.value) })}
              className="h-1 w-full cursor-pointer accent-[hsl(var(--primary))]"
            />
          </div>
        )}

        {item.status === "completed" && (
          <div className="space-y-1.5">
            <ScoreControl
              label="Knowledge"
              value={item.knowledge_score}
              onChange={(v) => patch({ knowledge_score: v })}
            />
            <ScoreControl
              label="Understanding"
              value={item.understanding_score}
              onChange={(v) => patch({ understanding_score: v })}
            />
            <ScoreControl
              label="Implementation"
              value={item.implementation_score}
              onChange={(v) => patch({ implementation_score: v })}
            />
            {item.next_review_at && (
              <div className="text-[11px] text-muted-foreground">
                Next revision {formatDate(item.next_review_at)} (every {item.review_interval_days}d)
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReadingPage() {
  const { data: items, isLoading } = useReadingList();
  const { data: due } = useDueReviews();
  const { data: projects } = useProjects();
  const createReading = useCreateReading();
  const completeReview = useCompleteReview();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ReadingKind>("article");
  const [projectId, setProjectId] = useState<string>("none");

  function submit() {
    if (!title.trim()) return;
    createReading.mutate(
      {
        title: title.trim(),
        author,
        url,
        kind,
        project_id: projectId === "none" ? null : projectId,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTitle("");
          setAuthor("");
          setUrl("");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Learning</h1>
          <p className="text-sm text-muted-foreground">
            Track what you read — and prove you understood it.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add reading
        </Button>
      </div>

      {due && due.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <RotateCcw className="h-4 w-4" /> Revision due
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {due.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{item.title}</span>
                <Button size="sm" variant="secondary" onClick={() => completeReview.mutate(item.id)}>
                  <Check className="h-3.5 w-3.5" /> Reviewed
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STATUS_COLUMNS.map(({ status, label }) => {
          const columnItems = items?.filter((i) => i.status === status) ?? [];
          return (
            <div key={status}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{columnItems.length}</span>
              </div>
              <div className="space-y-2.5">
                {columnItems.map((item) => (
                  <ReadingCard key={item.id} item={item} />
                ))}
                {columnItems.length === 0 && (
                  <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items && items.some((i) => i.status === "abandoned") && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Abandoned</summary>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {items
              .filter((i) => i.status === "abandoned")
              .map((item) => (
                <ReadingCard key={item.id} item={item} />
              ))}
          </div>
        </details>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to reading queue</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              autoFocus
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              <Input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
              <div className="grid gap-1.5">
                <Label>Kind</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as ReadingKind)}>
                  <SelectTrigger>
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
              </div>
              <div className="grid gap-1.5">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue />
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
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createReading.isPending}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
