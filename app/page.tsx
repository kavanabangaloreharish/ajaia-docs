import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocuments, type DocSummary } from "@/lib/documents";
import TopBar from "@/components/TopBar";
import DashboardActions from "@/components/DashboardActions";
import RoleBadge from "@/components/RoleBadge";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function DocList({ docs, empty, showOwner }: { docs: DocSummary[]; empty: string; showOwner?: boolean }) {
  if (docs.length === 0) return <div className="doc-list"><div className="empty">{empty}</div></div>;
  return (
    <div className="doc-list">
      {docs.map((d) => (
        <Link key={d.id} href={`/docs/${d.id}`} className="doc-row">
          <span className="doc-title">{d.title}</span>
          {showOwner && <span className="muted small">by {d.owner_name}</span>}
          <span className="muted small">Edited {formatDate(d.updated_at)}</span>
          <RoleBadge role={d.role} />
        </Link>
      ))}
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocuments(user.id);

  return (
    <>
      <TopBar userName={user.name} />
      <main className="container">
        <DashboardActions />
        <h2 className="section-title">My documents ({owned.length})</h2>
        <DocList docs={owned} empty="You haven't created any documents yet. Start with “New document” or import a file." />
        <h2 className="section-title">Shared with me ({shared.length})</h2>
        <DocList docs={shared} showOwner empty="Nothing has been shared with you yet." />
      </main>
    </>
  );
}
