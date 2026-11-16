import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { SESSION_COOKIE, sign } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export const POST = handle(async (req: Request) => {
  const { email } = schema.parse(await readJson(req));
  const db = await getDb();
  const rows = await db.query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
  if (rows.length === 0) throw new AppError(401, "Unknown demo account");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sign(rows[0].id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
