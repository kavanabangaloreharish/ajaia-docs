# Ajaia Docs: a lightweight collaborative document editor

A small full-stack document editor inspired by Google Docs. Users can create, rename, edit and reopen rich-text documents, import `.txt` / `.md` / `.docx` files as new documents, and share documents with other users as **editors** or **viewers**.

- **Live app:** `https://ajaia-docs-sigma-three.vercel.app/`
- **Walkthrough video:** see `VIDEO_URL.txt`
- **Architecture note:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **AI workflow note:** [`AI_WORKFLOW.md`](./AI_WORKFLOW.md)

## Demo accounts (mocked auth)

No passwords. On the sign-in page, click one of the seeded accounts:

| Name | Email |
|---|---|
| Alice Johnson | alice@ajaia.test |
| Bob Smith | bob@ajaia.test |
| Carol Lee | carol@ajaia.test |

**To test sharing:** sign in as Alice in a normal window and as Bob in a private/incognito window (each window keeps its own session cookie).

## Features

| Area | What works |
|---|---|
| Documents | Create, rename (click the title), edit, delete (owner only), reopen from the dashboard |
| Rich text | Bold, italic, underline, H1–H3, bulleted and numbered lists, quote, undo/redo, plus keyboard shortcuts (Ctrl/Cmd+B/I/U) |
| Saving | Autosave 0.8 s after you stop typing, with a "Saving… / All changes saved" status; retries automatically on failure; warns before you leave with unsaved changes |
| File import | Upload **.txt, .md or .docx (max 2 MB)** → a new editable document. Headings, bold/italic and lists are kept where the source has them |
| Sharing | The owner shares with another user as *Can edit* or *View only*, can change the role or remove access. The dashboard separates **My documents** and **Shared with me**, with role badges |
| Access rules | Enforced on the server: viewers can't edit; only owners can share or delete; users without access get a 404 |
| Safety | All stored HTML is sanitized server-side (no scripts or inline handlers); input is validated with zod; the session cookie is HMAC-signed and httpOnly |

## Run locally

Requirements: **Node.js 18.18+** (20 or 22 recommended). No database install needed.

```bash
npm install
npm run dev
# open http://localhost:3000
```

With no `DATABASE_URL` set, the app uses **PGlite** (an embedded Postgres) and stores data in `./.data/pglite`. Delete that folder to reset. The demo users are seeded automatically on startup.

Optional: copy `.env.example` to `.env.local` and set `DATABASE_URL` to use a real Postgres instead.

### Tests

```bash
npm test
```

There are 15 tests in two files:
- `tests/sharing.test.ts` runs integration tests against a real in-memory Postgres. They cover owner, editor, viewer and no-access permissions, role upgrades, revoking access, the owned vs shared lists, and HTML sanitization.
- `tests/import.test.ts` covers Markdown, text and .docx conversion, rejection of unsupported, empty, oversized and corrupt files, and validation.

### Production build

```bash
npm run build && npm start
```

## Deployment (free)

The app is deployed on **Vercel** (free Hobby plan), using a **Neon** free Postgres database.

1. Create a free Neon project and copy its connection string.
2. Import the GitHub repo into Vercel and set these environment variables:
   - `DATABASE_URL`: the Neon connection string
   - `SESSION_SECRET`: a long random string
3. Deploy. The tables and demo users are created automatically on the first request.

> PGlite (the local default) needs a writable disk, so a serverless deployment must set `DATABASE_URL`.

## Supported file types

Import supports **`.txt`, `.md` and `.docx` only, up to 2 MB**. The UI says this next to the Import button, and any other type is rejected with a clear message. Images inside .docx files are not imported.

## Known limitations

- There is no real-time co-editing. If two editors type at the same time, the last save wins (see `ARCHITECTURE.md`).
- Auth is mocked: you pick a seeded user, with no passwords or sign-up.
- You can only share with existing users, by choosing them from a list. There are no email invites.

## Project structure

```
app/                  Next.js App Router pages + API routes
  api/auth/…          mock login / logout
  api/documents/…     CRUD, import, sharing endpoints
  page.tsx            dashboard (My documents / Shared with me)
  docs/[id]/page.tsx  editor page
components/           client UI (editor, toolbar, share dialog…)
lib/                  server logic
  db.ts               Postgres (pg) or embedded PGlite + schema + seed
  documents.ts        all document + sharing rules (single source of truth)
  import.ts           .txt / .md / .docx → sanitized HTML
  auth.ts             signed-cookie session
  sanitize.ts, validation.ts, errors.ts, api.ts
tests/                vitest tests
```
