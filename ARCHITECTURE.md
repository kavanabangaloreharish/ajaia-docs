# Architecture Note

## Goal and approach

My aim was to ship a small, complete slice that works end to end, rather than a long list of half-finished features. I put my time into the areas reviewers will test first: a reliable editing and saving loop, file import that's useful in practice, and sharing rules enforced on the server.

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | Frontend and API in one codebase and one deployment. Server components load data directly; route handlers serve the API. |
| Editor | **TipTap 3 (ProseMirror)** | A proven rich-text engine. Building on it let me spend time on product behaviour instead of `contenteditable` edge cases. |
| Storage | **Postgres** (Neon in prod) / **PGlite** locally | The same SQL everywhere. Locally there's nothing to install, and `npm run dev` just works. Sharing is relational data (users ↔ documents), so SQL fits well. |
| Validation | **zod** + **sanitize-html** | Every input is validated at the API boundary, and stored HTML is limited to the tags the editor can produce. |
| Import | **marked** (.md), **mammoth** (.docx), plain-text parser | These cover the three most common document formats with a small amount of code. |
| Tests | **vitest** + in-memory PGlite | Access-control tests run against a real Postgres engine, with no mocked SQL. |

## Data model

```
users(id, email, name)
documents(id, owner_id → users, title, content HTML, created_at, updated_at)
document_shares(document_id → documents ON DELETE CASCADE, user_id → users,
                role 'viewer'|'editor', PRIMARY KEY(document_id, user_id))
```

- **Ownership is a column, and sharing is a separate table.** Access is resolved in one query: owner if `owner_id` matches, otherwise the role from `document_shares`, otherwise none.
- **Content is stored as sanitized HTML.** It's what TipTap exports, what the importers produce, and it keeps all the formatting this scope needs. The trade-off is that HTML is less structured than ProseMirror JSON, which would matter for features like comments anchored to text. Switching later would be a small migration.

## Key decisions

1. **Access rules live in one server module (`lib/documents.ts`).** Every route calls these functions with the signed-in user's id. The UI hides buttons for convenience, but the server is what enforces the rules, so a viewer calling the API directly still gets a 403.
2. **No access returns 404, not 403.** This way the API doesn't reveal which document ids exist.
3. **Autosave with a single-flight queue.** Edits are debounced (0.8 s), and only one save request runs at a time. Saves always send the latest content, so a slow request can't overwrite newer text with older text. Failures show in the status bar and retry automatically, and the browser warns you before you close the tab with unsaved changes.
4. **Import creates a new document.** I chose this over importing into an existing draft because it's the clearest behaviour, it's easy to explain, and it can't overwrite anyone's work.
5. **Mocked auth with a signed cookie.** The user picks a seeded account, and their id is stored in an HMAC-signed httpOnly cookie. Real auth wasn't the point of the exercise, but every request still has a tamper-proof identity, so the ownership and sharing logic behaves as it would with real auth.
6. **Role-based sharing (viewer/editor).** This was the stretch item I chose, because it's a small addition to the share table and it makes the sharing model meaningfully more realistic.

## What I deliberately did not build

| Deprioritized | Reason |
|---|---|
| Real-time co-editing (CRDT/Yjs, cursors) | The biggest single cost, and it needs websockets plus infrastructure beyond the timebox. The current behaviour is last-write-wins. |
| Real authentication and sign-up | The brief allows mocked users. Adding a provider would cost time without showing anything new about the product. |
| Comments, suggestions, version history | Worthwhile, but each one would have been a shallow version. I chose depth on the core features instead. |
| Images, tables, fonts and colours | These aren't needed for the core writing flow. |
| Folders, search, trash | Not needed at demo scale. |

## What I'd build next (2–4 hours)

1. **Conflict safety:** send `updated_at` with each save and return 409 if the document changed underneath, then show a "this doc was updated, reload?" banner. (About 1 hour.)
2. **Version history:** keep a `document_versions` snapshot every N saves, with a restore button. (About 1.5 hours.)
3. **Export to Markdown/PDF** from the editor. (About 30 minutes.)
4. **Real-time presence**, showing "Bob is viewing", via polling or Server-Sent Events as a first step toward co-editing.
