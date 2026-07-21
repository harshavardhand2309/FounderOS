/**
 * Ad-hoc document intake: upload or paste a doc ("we need to study these"),
 * get an AI/heuristic study-time estimate, and a ready-to-schedule task.
 */

import { FileUp, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useIntakeDocument, useProjects, type IntakeResult } from "@/api/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMinutes } from "@/lib/utils";

export function IntakeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projects } = useProjects();
  const intake = useIntakeDocument();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [instruction, setInstruction] = useState("Study and review this document");
  const [result, setResult] = useState<IntakeResult | null>(null);

  function reset() {
    setFile(null);
    setText("");
    setTitle("");
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit() {
    const form = new FormData();
    if (file) form.append("file", file);
    else form.append("text", text);
    if (title.trim()) form.append("title", title.trim());
    if (projectId !== "none") form.append("project_id", projectId);
    form.append("instruction", instruction);
    intake.mutate(form, { onSuccess: setResult });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add documents to study</DialogTitle>
        </DialogHeader>

        {result === null ? (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Upload (.pdf, .md, .txt)</Label>
              <Input
                ref={fileInput}
                type="file"
                accept=".pdf,.md,.markdown,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {!file && (
              <div className="grid gap-1.5">
                <Label>…or paste text</Label>
                <Textarea
                  rows={5}
                  placeholder="Paste the document contents"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Title (optional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
            <div className="grid gap-1.5">
              <Label>What should happen with it?</Label>
              <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 overflow-hidden rounded-md border text-center text-sm">
              <div className="border-r p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Reading
                </div>
                <div className="font-medium">{formatMinutes(result.reading_minutes)}</div>
              </div>
              <div className="border-r p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Summarize
                </div>
                <div className="font-medium">{formatMinutes(result.summary_minutes)}</div>
              </div>
              <div className="bg-primary/10 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total
                </div>
                <div className="font-semibold text-primary">
                  {formatMinutes(result.estimated_minutes)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{result.word_count.toLocaleString()} words</Badge>
              <Badge variant="outline" className="capitalize">
                {result.density}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                suggested: {result.suggested_priority}
              </Badge>
              <Badge variant="outline">{result.source === "ai" ? "AI estimate" : "heuristic"}</Badge>
            </div>
            {result.summary && <p className="text-sm text-muted-foreground">{result.summary}</p>}
            <p className="text-xs text-muted-foreground">
              Created a study task ("{result.title}"), a note, and a reading-queue entry. It's on
              the board as Ready — the next plan generation will slot it by priority, or open the
              task to adjust priority/deadline yourself.
            </p>
          </div>
        )}

        <DialogFooter>
          {result === null ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={intake.isPending || (!file && !text.trim())}
              >
                {intake.isPending ? (
                  "Analyzing…"
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Estimate & add
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={reset}>
                <FileUp className="h-4 w-4" /> Add another
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
