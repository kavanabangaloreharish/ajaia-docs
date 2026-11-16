import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { updateDocSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json(await getDocument(user.id, id));
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = updateDocSchema.parse(await readJson(req));
  return NextResponse.json(await updateDocument(user.id, id, input));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteDocument(user.id, id);
  return new NextResponse(null, { status: 204 });
});
