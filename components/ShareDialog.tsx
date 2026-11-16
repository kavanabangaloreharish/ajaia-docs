"use client";

import { useState } from "react";
import type { ShareRow } from "@/lib/documents";
import { initials } from "./LoginForm";

type User = { id: string; email: string; name: string };

export default function ShareDialog({
  docId,
  ownerId,
  shares,
  allUsers,
  onChange,
  onClose,
}: {
  docId: string;
  ownerId: string;
  shares: ShareRow[];
  allUsers: User[];
  onChange: (shares: ShareRow[]) => void;
  onClose: () => void;
}) {
  const candidates = allUsers.filter((u) => u.id !== ownerId);
  const [email, setEmail] = useState(candidates[0]?.email ?? "");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(method: "POST" | "DELETE", body: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${docId}/shares`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      onChange(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const alreadyShared = shares.find((s) => s.email === email);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Share document" onClick={(e) => e.stopPropagation()}>
        <h2>Share document</h2>
        <p className="muted small">Give another user access. Editors can change content; viewers can only read.</p>
        <div className="row">
          <select className="field" style={{ flex: 1 }} value={email} onChange={(e) => setEmail(e.target.value)}>
            {candidates.map((u) => (
              <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select className="field" value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
            <option value="editor">Can edit</option>
            <option value="viewer">View only</option>
          </select>
          <button className="btn btn-primary" disabled={busy || !email} onClick={() => call("POST", { email, role })}>
            {alreadyShared ? "Update" : "Share"}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}

        <div className="share-list">
          {shares.length === 0 && <div className="share-item muted small">Only you have access.</div>}
          {shares.map((s) => (
            <div className="share-item" key={s.user_id}>
              <span className="avatar">{initials(s.name)}</span>
              <span style={{ flex: 1 }}>
                <div>{s.name}</div>
                <div className="muted small">{s.email}</div>
              </span>
              <span className={`badge badge-${s.role}`}>{s.role === "editor" ? "Can edit" : "View only"}</span>
              <button className="btn btn-ghost btn-danger small" disabled={busy} onClick={() => call("DELETE", { userId: s.user_id })}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
