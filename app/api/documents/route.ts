import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createDocument, listDocuments } from "@/lib/documents";
import { createDocSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocuments(user.id));
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const input = createDocSchema.parse(await readJson(req));
  const doc = await createDocument(user.id, input);
  return NextResponse.json(doc, { status: 201 });
});
