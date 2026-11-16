/**
 * Document + sharing business logic. Every function takes the acting user's id and
 * enforces access rules here (not in the UI), so API routes stay thin and tests can
 * exercise the real rules against a real database.
 */
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { AppError, badRequest, forbidden, notFound } from "./errors";
import { sanitizeContent } from "./sanitize";

export type Access = "owner" | "editor" | "viewer";
export type ShareRole = "viewer" | "editor";

export interface DocSummary {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  updated_at: string;
  role: Access;
}

export interface DocFull extends DocSummary {
  content: string;
  created_at: string;
}

export interface ShareRow {
  user_id: string;
  email: string;
  name: string;
  role: ShareRole;
}

const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));

function normalize<T extends { updated_at: unknown; created_at?: unknown }>(row: T): T {
  return { ...row, updated_at: toIso(row.updated_at), ...(row.created_at !== undefined ? { created_at: toIso(row.created_at) } : {}) };
}

/** Resolve the caller's access to a document. Returns null when they have none. */
export async function getAccess(userId: string, docId: string): Promise<Access | null> {
  const db = await getDb();
  const rows = await db.query<{ owner_id: string; role: ShareRole | null }>(
    `SELECT d.owner_id, s.role
       FROM documents d
       LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $2
      WHERE d.id = $1`,
    [docId, userId],
  );
  if (rows.length === 0) return null;
  if (rows[0].owner_id === userId) return "owner";
  return rows[0].role ?? null;
}

export async function listDocuments(userId: string): Promise<{ owned: DocSummary[]; shared: DocSummary[] }> {
  const db = await getDb();
  const owned = await db.query<DocSummary>(
    `SELECT d.id, d.title, d.owner_id, u.name AS owner_name, d.updated_at, 'owner' AS role
       FROM documents d JOIN users u ON u.id = d.owner_id
      WHERE d.owner_id = $1
      ORDER BY d.updated_at DESC`,
    [userId],
  );
  const shared = await db.query<DocSummary>(
    `SELECT d.id, d.title, d.owner_id, u.name AS owner_name, d.updated_at, s.role
       FROM document_shares s
       JOIN documents d ON d.id = s.document_id
       JOIN users u ON u.id = d.owner_id
      WHERE s.user_id = $1
      ORDER BY d.updated_at DESC`,
    [userId],
  );
  return { owned: owned.map(normalize), shared: shared.map(normalize) };
}

export async function createDocument(userId: string, input: { title?: string; content?: string }): Promise<DocFull> {
  const db = await getDb();
  const id = randomUUID();
  const title = input.title?.trim() || "Untitled document";
  const content = sanitizeContent(input.content ?? "");
  await db.query(`INSERT INTO documents (id, owner_id, title, content) VALUES ($1, $2, $3, $4)`, [id, userId, title, content]);
  return getDocument(userId, id);
}

export async function getDocument(userId: string, docId: string): Promise<DocFull> {
  const access = await getAccess(userId, docId);
  // 404 (not 403) when there is no access, so we don't reveal which ids exist.
  if (!access) throw notFound();
  const db = await getDb();
  const rows = await db.query<Omit<DocFull, "role">>(
    `SELECT d.id, d.title, d.content, d.owner_id, u.name AS owner_name, d.created_at, d.updated_at
       FROM documents d JOIN users u ON u.id = d.owner_id
      WHERE d.id = $1`,
    [docId],
  );
  return normalize({ ...rows[0], role: access });
}

export async function updateDocument(
  userId: string,
  docId: string,
  input: { title?: string; content?: string },
): Promise<DocFull> {
  const access = await getAccess(userId, docId);
  if (!access) throw notFound();
  if (access === "viewer") throw forbidden("You have view-only access to this document");

  const db = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [docId];
  if (input.title !== undefined) {
    params.push(input.title.trim());
    sets.push(`title = $${params.length}`);
  }
  if (input.content !== undefined) {
    params.push(sanitizeContent(input.content));
    sets.push(`content = $${params.length}`);
  }
  if (sets.length === 0) throw badRequest("Nothing to update");
  await db.query(`UPDATE documents SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, params);
  return getDocument(userId, docId);
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
  const access = await getAccess(userId, docId);
  if (!access) throw notFound();
  if (access !== "owner") throw forbidden("Only the owner can delete a document");
  const db = await getDb();
  await db.query(`DELETE FROM documents WHERE id = $1`, [docId]);
}

export async function listShares(userId: string, docId: string): Promise<ShareRow[]> {
  const access = await getAccess(userId, docId);
  if (!access) throw notFound();
  const db = await getDb();
  return db.query<ShareRow>(
    `SELECT s.user_id, u.email, u.name, s.role
       FROM document_shares s JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1
      ORDER BY u.name`,
    [docId],
  );
}

export async function shareDocument(userId: string, docId: string, email: string, role: ShareRole): Promise<ShareRow[]> {
  const access = await getAccess(userId, docId);
  if (!access) throw notFound();
  if (access !== "owner") throw forbidden("Only the owner can share this document");

  const db = await getDb();
  const users = await db.query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (users.length === 0) throw new AppError(404, `No user found with email ${email}`);
  const targetId = users[0].id;
  if (targetId === userId) throw badRequest("You already own this document");

  // Upsert: sharing again with a different role changes the role.
  await db.query(
    `INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [docId, targetId, role],
  );
  return listShares(userId, docId);
}

export async function revokeShare(userId: string, docId: string, targetUserId: string): Promise<ShareRow[]> {
  const access = await getAccess(userId, docId);
  if (!access) throw notFound();
  if (access !== "owner") throw forbidden("Only the owner can change sharing");
  const db = await getDb();
  await db.query(`DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2`, [docId, targetUserId]);
  return listShares(userId, docId);
}

export async function listUsers(): Promise<{ id: string; email: string; name: string }[]> {
  const db = await getDb();
  return db.query(`SELECT id, email, name FROM users ORDER BY name`);
}
