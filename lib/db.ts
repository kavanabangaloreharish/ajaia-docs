/**
 * Tiny database layer.
 * - DATABASE_URL set  -> real Postgres via `pg` (used in production, e.g. Neon/Supabase).
 * - DATABASE_URL unset -> embedded Postgres (PGlite) stored in ./.data/pglite, so local
 *   setup needs zero installs. PGLITE_DIR=memory:// gives an in-memory DB (used by tests).
 * Both speak the same SQL, so there is one schema and one set of queries.
 */
import { SEED_USERS } from "./seed";

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id    TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id);
CREATE TABLE IF NOT EXISTS document_shares (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  role        TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS shares_user_idx ON document_shares(user_id);
`;

async function createDb(): Promise<Db> {
  let db: Db;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const url = process.env.DATABASE_URL;
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false }, max: 5 });
    db = {
      async query(sql, params) {
        const r = await pool.query(sql, params as unknown[]);
        return r.rows;
      },
      async exec(sql) {
        await pool.query(sql);
      },
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
    if (dir !== "memory://") {
      // PGlite does not create parent folders itself; a fresh clone has no ./.data yet.
      const { mkdirSync } = await import("node:fs");
      mkdirSync(dir, { recursive: true });
    }
    const pg = dir === "memory://" ? new PGlite() : new PGlite(dir);
    db = {
      async query(sql, params) {
        const r = await pg.query(sql, params as unknown[]);
        return r.rows as never[];
      },
      async exec(sql) {
        await pg.exec(sql);
      },
    };
  }

  await db.exec(SCHEMA);
  for (const u of SEED_USERS) {
    await db.query(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [u.id, u.email, u.name],
    );
  }
  return db;
}

// Cache across hot reloads / serverless invocations in the same process.
const g = globalThis as unknown as { __dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__dbPromise) {
    g.__dbPromise = createDb().catch((err) => {
      g.__dbPromise = undefined; // allow retry on next request
      throw err;
    });
  }
  return g.__dbPromise;
}
