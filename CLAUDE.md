# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an npm workspaces monorepo (`apps/*`, `services/*`, `orchestration`). Node >= 20.

- `npm run build` / `npm run lint` — run across all workspaces. Note: `lint` is `tsc --noEmit` everywhere; there is no ESLint. A "lint failure" is a TypeScript error.
- `npm run dev:web` — Next.js 15 / React 19 frontend on port 3000.
- `npm run dev:api` — Fastify backend with `tsx watch`. Default port 4000 (override via `PORT`).
- `npm --workspace @mon-super-agent/<name> run <script>` — run a single workspace's script.

Orchestration entry points (Notion-driven, see Architecture below):
- `npm run orchestration:demo` — local in-memory simulation, no network.
- `npm run orchestration:run-live` — picks one ready Notion task, executes it, writes back to `In Review`. Requires `NOTION_TOKEN` and `NOTION_DATA_SOURCE_ID` in env.
- `npm run orchestration:run-autonomous` — same as run-live, but **also commits and pushes to `origin/main`** and marks the task `Done`. Treat this as a destructive remote operation.

There is no test runner configured yet — do not invent `npm test` commands.

## Architecture

The product is "Mon Super Agent": a web app where users provision a personal AI agent that they then talk to over Telegram (MVP) or WhatsApp (later). The data flow is `apps/web` → `apps/api` (Fastify) → `services/agent-runtime` → messaging connector. See `ARCHITECTURE.md` and `PRODUCT.md` for product framing; this section covers what's non-obvious from the code.

### Workspace wiring

`tsconfig.base.json` defines a path alias: `@mon-super-agent/agent-runtime` → `services/agent-runtime/src/index.ts`. `apps/api` imports the runtime via this package name; the runtime workspace itself currently has no runtime dependencies and exports plain types/factories. When adding code to `services/agent-runtime`, re-export it from `src/index.ts` or it won't be reachable from the API.

### Orchestration layer (`orchestration/`)

This is the unusual part of the repo. The orchestration package is a Notion-driven task runner that turns Notion database rows into repo changes and (in autonomous mode) git commits. Key files:

- `src/task-types.ts` — the `OrchestrationTask` shape. Notable optional fields driven from Notion: `executionMode`, `filesToTouch`, `implementationBrief`, `validationCommands`, `commitMessage`, `automationPolicy`.
- `src/notion-adapter.ts` — `NotionApiTaskTrackerAdapter` queries the data source at `NOTION_DATA_SOURCE_ID` and maps Notion property types to `OrchestrationTask`. `InMemoryNotionAdapter` is the demo equivalent.
- `src/symphony-runner.ts` — picks the next `Todo` MVP task, transitions it through `In Progress` → (`In Review` | `Done` | `Blocked` | back to `Todo`), and writes `Run ID` / `Agent Output` / `Last Sync At` back to Notion.
- `src/repo-task-executor.ts` — converts a task into file changes. Two paths:
  1. **Generic execution** (preferred for new work): if the task has `executionMode = generic_markdown` or `generic_spec`, plus `filesToTouch` and `implementationBrief`, the executor creates/appends those files from Notion-supplied content. No code change in this repo is required to onboard a new task.
  2. **Hand-coded handlers**: a small `handlers` map keyed by task ID (e.g. `MSA-003`, `MSA-007`). These exist for early MVP tasks and write specific markdown/TSX/CSS edits. Avoid adding new entries here unless generic execution genuinely cannot express the task.
- `src/run-autonomous.ts` — wraps the executor with `runRepoChecks` (runs `validationCommands` or defaults to `npm run lint && npm run build`), then `commitAndPush` to `origin/main`. Failures flip the task to `Blocked` with the error in `Agent Output`.

Every orchestrated run writes a review artifact to `orchestration/runs/<run-id>.md` listing the changed files. Don't delete these — they're the human-facing review surface referenced from Notion.

### Notion as source of truth

Planning lives in the Notion database `Mon Super Agent - Tasks`. The repo is the delivery source of truth. The full field mapping is in `orchestration/notion-field-mapping.md` and the operating model is in `docs/SYMPHONY-NOTION.md`. When a user asks to "execute task X" or references an `MSA-###` ID, that ID is the Notion task `ID` field, not a git branch or PR.

### Status lifecycle

`Inbox` → `Todo` → `In Progress` → (`In Review` | `Blocked` | `Done`). The runner only picks `Todo` items in sprint `MVP` with no unresolved `Blocked By` relations. A task missing `acceptanceCriteria` will be moved to `Blocked` rather than executed.

## Conventions worth knowing

- The autonomous runner pushes directly to `main`. There is no PR flow yet — the commit IS the review artifact, paired with the run file under `orchestration/runs/`.
- `dist/` directories are gitignored but present locally after builds; don't read them, read `src/`.
- `.env` is gitignored; `.env.example` lists the expected keys (`NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `NOTION_API_VERSION`, `PORT`, `NEXT_PUBLIC_*`).
