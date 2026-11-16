"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = { id: string; email: string; name: string };

export const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export default function LoginForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function login(email: string) {
    setBusy(email);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Login failed");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setBusy(null);
    }
  }

  return (
    <div>
      {users.map((u) => (
        <button key={u.id} className="user-option" onClick={() => login(u.email)} disabled={busy !== null}>
          <span className="avatar">{initials(u.name)}</span>
          <span>
            <div>{u.name}</div>
            <div className="muted small">{u.email}</div>
          </span>
          <span className="spacer" />
          {busy === u.email && <span className="muted small">Signing in…</span>}
        </button>
      ))}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
