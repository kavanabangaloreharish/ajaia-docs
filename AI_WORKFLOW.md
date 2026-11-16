# AI Workflow Note

## Tools used
- **Claude**: turned the brief into a scoped plan, generated a full reference
  implementation (code, tests, docs), and helped me debug while I set it up.
- **VS Code + PowerShell** on Windows for building, running and deploying it myself.

## How I used AI
1. **Scoping.** I gave Claude the brief and asked for a prioritized plan. It
   proposed the core features plus one stretch item (viewer/editor roles), and
   explicit cuts (real-time co-editing, real auth, comments). I agreed with these
   cuts because they keep the work within the timebox.
2. **Reference implementation.** Claude generated the app, ran its own tests and
   browser checks, and gave me the code with a step-by-step guide.
3. **Rebuilding and running it myself.** I set the project up on my own machine
   file by file, ran the tests, used the app, pushed it to GitHub and deployed it
   (Vercel + Neon). Whenever something broke, I used Claude to debug it.

## Where AI materially sped things up
- Producing a working full-stack slice (Next.js API routes, TipTap editor,
  sharing rules, tests) far faster than I could have written it from scratch.
- Explaining unfamiliar parts (App Router, route handlers, Postgres via Neon).
- Debugging environment and deployment problems quickly (below).

## Problems I hit and how I fixed them
| Problem | Cause | Fix |
|---|---|---|
| `npm` not recognized in the VS Code terminal | VS Code was opened before Node was on PATH | Restarted VS Code |
| `npm install` slow / folder locked | Project was inside OneDrive, which syncs every file | Moved the project to `C:\dev` |
| "Default export is not a React Component in /layout" | `app/layout.tsx` and three other files were empty (0 bytes) after a mix-up while copying | Found every 0-byte file with a PowerShell script and restored it |
| Saving failed with **405** | `app/api/documents/[id]/route.ts` was empty, so there was no PATCH handler | Restored the file. Saves now show "All changes saved" |
| Import endpoint missing | `app/api/documents/import/route.ts` was never created | A script compared my project to the reference and found it |
| Component file names misspelled or lowercase (`dhashboardactions.tsx`, `sharedialogue.tsx`) | Typos when creating files | Renamed them. Windows ignores case, but Vercel (Linux) doesn't, so this would have broken the deploy |
| Git push rejected | Remote URL still had a `<your-username>` placeholder, and later I had edited files on GitHub's website | Fixed it with `git remote set-url`, then `git pull` before pushing |

## What I learned about using AI
- AI can generate a working app quickly, but **getting it running correctly on
  my machine** surfaced real issues that only running it could catch: empty
  files, case-sensitive names, sync folders.
- I learned to check things myself instead of trusting that they worked
  (file sizes, test runs, the live site) and to read error codes like 405
  as clues about what's missing.

## How I verified it works
- `npm test`: all 15 automated tests pass (sharing permissions against a real
  Postgres engine, import, validation).
- Local checklist: create, format, refresh (formatting persists), import, share,
  and a second user in a private window (view-only, then edit).
- The same checklist on the live Vercel deployment.