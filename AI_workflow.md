# AI Workflow Note

## Tools used

- **Claude** (chat and agentic coding): planning the scope, scaffolding, writing most of the first-draft code, tests and docs, and running builds and smoke tests.
- **Playwright with headless Chrome** (driven by AI-written scripts): click-through checks of the real UI.
- *(Add any others you actually used, e.g. Cursor or Copilot in your editor.)*

## How I used AI

1. **Scope first.** Before writing any code, I had the AI turn the brief into a prioritized list: must-haves (editing, saving, import, sharing, persistence, tests, deploy), one stretch item (viewer/editor roles), and explicit cuts (real-time collaboration, real auth, comments). I made the final calls on what to cut.
2. **Small, specific requests.** I asked for one module at a time (DB layer → access rules → API routes → UI → tests). Each request stated the constraints, for example "all access checks must be in the service layer", "return 404 when there's no access", or "only one autosave request in flight".
3. **Verify every step** before moving on: type-check, tests, production build, API smoke tests with curl, then a real browser walkthrough.

## Where AI materially sped things up

- **Boilerplate and wiring:** Next.js route handlers, zod schemas, the TipTap toolbar and CSS. This would have been hours of typing, and it took minutes.
- **Test cases:** AI suggested edge cases I might have missed, such as sharing with yourself, re-sharing to change a role, mixed-case emails, and corrupt .docx files.
- **Import pipeline:** choosing and wiring `marked` and `mammoth`, plus the plain-text → paragraphs conversion.
- **Docs:** first drafts of the README and these notes, which I then edited.

## What I changed or rejected

| AI output | What I did |
|---|---|
| Initial install pulled **TypeScript 7** (native preview) | I pinned **TypeScript 5**, which Next.js 15 supports. The newest version isn't automatically the right one. |
| The embedded DB layer assumed PGlite would create its own data folder | My smoke test on a fresh install **failed with ENOENT**, so I added `mkdirSync(..., { recursive: true })`. The unit tests had missed it because they use an in-memory DB. |
| The first suggestion was to return **403** for any document you can't access | I changed it to **404** when you have no access, so the API doesn't reveal which documents exist. I kept 403 for "you can see it but can't do this". |
| Access checks were drafted in the UI (hiding buttons) | I moved all enforcement into `lib/documents.ts` on the server. Hidden buttons alone don't stop a viewer calling the API directly. |
| A simple "save on every change" autosave | I rewrote it as a debounced, single-flight queue with retry, because overlapping requests could save older content over newer. |
| Vitest config written as `.ts` with `__dirname` | I renamed it to `.mts` and used `import.meta.url` to fix the ESM warning. |
| A disabled toolbar shown to viewers | I hid it completely after seeing it in the browser, because greyed-out buttons looked broken. |
| Sanitizing only on render | I sanitize on **write** (server-side), so nothing unsafe is ever stored, including from imported files. |

## How I verified correctness, UX and reliability

- **Automated tests (15):** permission rules for owner, editor, viewer and no-access users against a real Postgres engine; sanitization; and import of all three formats plus bad inputs.
- **Type-check and production build** (`tsc --noEmit`, `next build`) before every commit.
- **API smoke test with curl** on a fresh database. It checks that a viewer editing gets 403, a user without access gets 404, an empty title and malformed JSON get 400, an unsupported file type gets a clear 400 message, and a forged session cookie gets 401.
- **Real browser walkthrough** with two separate sessions (Alice and Bob). I created a doc, applied each format, waited for "All changes saved", **reloaded the page and confirmed the formatting persisted**, shared it as view-only, and confirmed Bob sees it under "Shared with me" and can't edit it.
- **Manual review of every AI-written file** before keeping it. I wouldn't submit code I couldn't explain line by line.

## Takeaway

AI did most of the typing. I kept the decisions about scope, the security model, data integrity and UX. AI made the mistakes that slipped through my early checks (wrong TypeScript version, a missing data folder), and running things for real is what caught them, not reading the code.
