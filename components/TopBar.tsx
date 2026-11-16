"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { initials } from "./LoginForm";

export default function TopBar({ userName, children }: { userName: string; children?: React.ReactNode }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link href="/" className="brand" title="All documents">
        <span className="brand-mark" /> Ajaia Docs
      </Link>
      {children}
      <span className="spacer" />
      <span className="avatar" title={userName}>{initials(userName)}</span>
      <span className="small">{userName}</span>
      <button className="btn btn-ghost small" onClick={logout}>Sign out</button>
    </header>
  );
}
