import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDocument, listShares, listUsers } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import DocEditor from "@/components/DocEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let doc;
  try {
    doc = await getDocument(user.id, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const [shares, users] = await Promise.all([listShares(user.id, id), listUsers()]);

  return <DocEditor doc={doc} user={user} initialShares={shares} allUsers={users} />;
}
