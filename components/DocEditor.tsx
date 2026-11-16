"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DocFull, ShareRow } from "@/lib/documents";
import TopBar from "./TopBar";
import RoleBadge from "./RoleBadge";
import ShareDialog from "./ShareDialog";

type User = { id: string; email: string; name: string };
type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 3000;

async function patchDoc(id: string, body: { title?: string; content?: string }) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
  return data as DocFull;
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  if (!editor) return <div className="toolbar" />;
  const btn = (label: string, title: string, active: boolean, run: () => void, style?: React.CSSProperties) => (
    <button
      type="button"
      className={`tb-btn${active ? " active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={run}
      style={style}
    >
      {label}
    </button>
  );
  const chain = () => editor.chain().focus();
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {btn("B", "Bold (Ctrl+B)", editor.isActive("bold"), () => chain().toggleBold().run(), { fontWeight: 700 })}
      {btn("I", "Italic (Ctrl+I)", editor.isActive("italic"), () => chain().toggleItalic().run(), { fontStyle: "italic" })}
      {btn("U", "Underline (Ctrl+U)", editor.isActive("underline"), () => chain().toggleUnderline().run(), { textDecoration: "underline" })}
      <span className="tb-sep" />
      {btn("Normal", "Normal text", editor.isActive("paragraph"), () => chain().setParagraph().run())}
      {btn("H1", "Heading 1", editor.isActive("heading", { level: 1 }), () => chain().toggleHeading({ level: 1 }).run())}
      {btn("H2", "Heading 2", editor.isActive("heading", { level: 2 }), () => chain().toggleHeading({ level: 2 }).run())}
      {btn("H3", "Heading 3", editor.isActive("heading", { level: 3 }), () => chain().toggleHeading({ level: 3 }).run())}
      <span className="tb-sep" />
      {btn("• List", "Bulleted list", editor.isActive("bulletList"), () => chain().toggleBulletList().run())}
      {btn("1. List", "Numbered list", editor.isActive("orderedList"), () => chain().toggleOrderedList().run())}
      {btn("❝", "Quote", editor.isActive("blockquote"), () => chain().toggleBlockquote().run())}
      <span className="tb-sep" />
      {btn("↺", "Undo (Ctrl+Z)", false, () => chain().undo().run())}
      {btn("↻", "Redo (Ctrl+Shift+Z)", false, () => chain().redo().run())}
    </div>
  );
}

export default function DocEditor({
  doc,
  user,
  initialShares,
  allUsers,
}: {
  doc: DocFull;
  user: User;
  initialShares: ShareRow[];
  allUsers: User[];
}) {
  const router = useRouter();
  const canEdit = doc.role !== "viewer";
  const isOwner = doc.role === "owner";

  const [title, setTitle] = useState(doc.title);
  const savedTitle = useRef(doc.title);
  const [titleError, setTitleError] = useState("");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState("");
  const [shares, setShares] = useState(initialShares);
  const [showShare, setShowShare] = useState(false);

  // --- Autosave: debounce edits, never run two saves at once, always save the latest content.
  const pending = useRef<string | null>(null);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (saving.current) return; // the running loop will pick up the latest pending content
    saving.current = true;
    try {
      while (pending.current !== null) {
        const html = pending.current;
        pending.current = null;
        setStatus("saving");
        try {
          await patchDoc(doc.id, { content: html });
        } catch (e) {
          if (pending.current === null) pending.current = html; // keep the unsaved content
          setSaveError(e instanceof Error ? e.message : "Save failed");
          setStatus("error");
          timer.current = setTimeout(flush, RETRY_DELAY_MS);
          return;
        }
      }
      setSaveError("");
      setStatus("saved");
    } finally {
      saving.current = false;
    }
  }, [doc.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false, // avoid SSR hydration mismatch
    shouldRerenderOnTransaction: true, // keep toolbar active states in sync
    onUpdate: ({ editor }) => {
      pending.current = editor.getHTML();
      setStatus("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
  });

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pending.current !== null || saving.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function saveTitle() {
    const next = title.trim();
    if (next === savedTitle.current) return setTitle(next);
    if (!next) {
      setTitleError("Title cannot be empty");
      setTitle(savedTitle.current);
      return;
    }
    try {
      const updated = await patchDoc(doc.id, { title: next });
      savedTitle.current = updated.title;
      setTitle(updated.title);
      setTitleError("");
    } catch (e) {
      setTitleError(e instanceof Error ? e.message : "Could not rename");
      setTitle(savedTitle.current);
    }
  }

  async function deleteDoc() {
    if (!window.confirm(`Delete “${savedTitle.current}”? This cannot be undone.`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      pending.current = null;
      router.replace("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not delete document");
    }
  }

  const statusText = {
    saved: "All changes saved",
    unsaved: "Unsaved changes…",
    saving: "Saving…",
    error: `Save failed – retrying (${saveError})`,
  }[status];

  return (
    <>
      <TopBar userName={user.name}>
        <input
          className="title-input"
          aria-label="Document title"
          value={title}
          maxLength={200}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <RoleBadge role={doc.role} />
        {canEdit && <span className={`save-status${status === "error" ? " error" : ""}`} aria-live="polite">{statusText}</span>}
        {isOwner && (
          <>
            <button className="btn btn-primary" onClick={() => setShowShare(true)}>
              Share{shares.length > 0 ? ` (${shares.length})` : ""}
            </button>
            <button className="btn btn-ghost btn-danger small" onClick={deleteDoc}>Delete</button>
          </>
        )}
      </TopBar>
      {canEdit && <Toolbar editor={editor} disabled={false} />}
      <main>
        <div className="paper">
          {titleError && <div className="notice">{titleError}</div>}
          {!isOwner && (
            <div className="notice">
              Shared with you by {doc.owner_name}.{" "}
              {canEdit ? "You can edit this document." : "You have view-only access."}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </main>
      {showShare && (
        <ShareDialog
          docId={doc.id}
          ownerId={doc.owner_id}
          shares={shares}
          allUsers={allUsers}
          onChange={setShares}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
