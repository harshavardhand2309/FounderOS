/**
 * TipTap rich-text editor for app-native notes. Vault notes (synced from a
 * watched folder) render read-only markdown instead — the file is the source
 * of truth.
 *
 * Storage: content_json holds the TipTap document; content_md holds the
 * plain-text projection used by global search.
 */

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUpdateNote } from "@/api/hooks";
import type { Note } from "@/api/types";

const AUTOSAVE_DELAY_MS = 800;

export function NoteEditor({ note }: { note: Note }) {
  const updateNote = useUpdateNote();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVaultNote = note.source_path !== null;

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: "Write your research, decisions, learnings…" }),
      ],
      content: note.content_json ? (JSON.parse(note.content_json) as object) : note.content_md,
      editable: !isVaultNote,
      onUpdate: ({ editor: instance }) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          updateNote.mutate({
            id: note.id,
            changes: {
              content_json: JSON.stringify(instance.getJSON()),
              content_md: instance.getText(),
            },
          });
        }, AUTOSAVE_DELAY_MS);
      },
    },
    [note.id],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (isVaultNote) {
    return (
      <div className="prose prose-sm prose-invert max-w-none p-1 text-sm leading-relaxed [&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content_md}</ReactMarkdown>
      </div>
    );
  }

  return <EditorContent editor={editor} className="tiptap-wrapper" />;
}
