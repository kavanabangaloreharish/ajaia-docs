import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listShares, revokeShare, shareDocument } from "@/lib/documents";
import { shareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json(await listShares(user.id, id));
});

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { email, role } = shareSchema.parse(await readJson(req));
  return NextResponse.json(await shareDocument(user.id, id, email, role));
});

const revokeSchema = z.object({ userId: z.string().min(1) });

export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { userId } = revokeSchema.parse(await readJson(req));
  return NextResponse.json(await revokeShare(user.id, id, userId));
});
