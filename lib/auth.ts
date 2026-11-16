/**
 * Mocked auth: the user picks one of the seeded accounts and we store their id in an
 * HMAC-signed, httpOnly cookie. Not production auth, but it gives every request a real,
 * tamper-proof identity so ownership and sharing rules are enforced server-side.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { AppError } from "./errors";

export const SESSION_COOKIE = "session";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-only-insecure-secret";
}

export function sign(userId: string): string {
  const mac = createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = token.slice(0, i);
  const expected = Buffer.from(sign(userId));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return userId;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = verify(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const db = await getDb();
  const rows = await db.query<SessionUser>(`SELECT id, email, name FROM users WHERE id = $1`, [userId]);
  return rows[0] ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "Please sign in");
  return user;
}
