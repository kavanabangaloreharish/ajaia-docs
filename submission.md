# Submission: AI-Native Full Stack Developer Assignment

**Candidate:** Kavana Bangalore Harish
**Project:** Ajaia Docs, a lightweight collaborative document editor

## Links

| Item | Link |
|---|---|
| Live app | `<YOUR_VERCEL_URL>` |
| Walkthrough video | see `VIDEO_URL.txt` |
| Source code (GitHub) | `<YOUR_GITHUB_REPO_URL>` (optional, also in this folder) |

## Test accounts

There are no passwords. Click an account on the sign-in page.

| Name | Email |
|---|---|
| Alice Johnson | alice@ajaia.test |
| Bob Smith | bob@ajaia.test |
| Carol Lee | carol@ajaia.test |

**Sharing test:** sign in as **Alice** in a normal window and as **Bob** in an incognito window. As Alice, create a doc, click **Share**, and choose Bob with *View only* or *Can edit*. Bob will see it under **Shared with me**.

## What's included in this folder

| File / folder | Contents |
|---|---|
| `app/`, `components/`, `lib/` | Source code (Next.js + TypeScript) |
| `tests/` | Automated tests (`npm test`, 15 tests) |
| `README.md` | Features, local setup, run, test and deploy instructions |
| `ARCHITECTURE.md` | Architecture note: priorities, decisions, trade-offs, next steps |
| `AI_WORKFLOW.md` | AI workflow note: tools, speed-ups, what I changed or rejected, verification |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Walkthrough video link |
| `screenshots/` | Screenshots of the main flows |
| `package.json`, `package-lock.json`, configs | Dependencies and build config |

`node_modules/`, `.next/` and local data are excluded. Run `npm install` to restore dependencies.

## Status

**Working end to end**
- Create, rename, edit, autosave, reopen and delete documents
- Rich text: bold, italic, underline, H1–H3, bulleted and numbered lists, quote, undo/redo
- Import .txt, .md or .docx (≤ 2 MB) as a new document
- Sharing with an owner, plus Can edit / View only roles, changing roles and removing access
- Separate "My documents" and "Shared with me" lists with role badges
- Persistence in Postgres, so formatting and sharing survive a refresh
- Server-side validation, sanitization and permission checks, with automated tests

**Intentionally not built:** real-time co-editing, real auth or sign-up, comments, version history, images and tables. The reasons are in `ARCHITECTURE.md`.

**Next 2–4 hours:** conflict detection on save (409 + reload prompt), version history with restore, Markdown/PDF export, and presence indicators.
