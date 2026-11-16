"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function DashboardActions() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "import" | null>(null);
  const [error, setError] = useState("");

  async function createDoc() {
    setBusy("new");
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create document");
      router.push(`/docs/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create document");
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setError("");
    if (file.size > 2_000_000) {
      setError("File is too large (max 2 MB)");
      return;
    }
    setBusy("import");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      router.push(`/docs/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setBusy(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <div className="actions">
        <button className="btn btn-primary" onClick={createDoc} disabled={busy !== null}>
          {busy === "new" ? "Creating…" : "+ New document"}
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
          {busy === "import" ? "Importing…" : "Import file"}
        </button>
        <span className="muted small">Import supports .txt, .md and .docx (max 2 MB) and creates a new editable document.</span>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.docx"
          hidden
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
        />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
