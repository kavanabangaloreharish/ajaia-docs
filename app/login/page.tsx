import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/documents";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const users = await listUsers();
  return (
    <div className="login-card">
      <h1>Ajaia Docs</h1>
      <p className="muted small">
        Demo mode: pick a seeded account to sign in. Use two different accounts (e.g. a normal and a private
        window) to try sharing.
      </p>
      <LoginForm users={users} />
    </div>
  );
}
