# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an npm workspaces monorepo (`apps/*`, `services/*`). Node >= 20.

- `npm run build` / `npm run lint` — run across all workspaces. Note: `lint` is `tsc --noEmit` everywhere; there is no ESLint. A "lint failure" is a TypeScript error.
- `npm run dev:web` — Next.js 15 / React 19 frontend on port 3000.
- `npm run dev:api` — Fastify backend with `tsx watch`. Default port 4000 (override via `PORT`).
- `npm --workspace @mon-super-agent/<name> run <script>` — run a single workspace's script.

There is no test runner configured yet — do not invent `npm test` commands.

## Architecture

The product is "Mon Super Agent": a web app where users provision a personal AI agent that they then talk to over Telegram (MVP) or WhatsApp (later). The data flow is `apps/web` → `apps/api` (Fastify) → `services/agent-runtime` → messaging connector. See `ARCHITECTURE.md` and `PRODUCT.md` for product framing; this section covers what's non-obvious from the code.

### Workspace wiring

`tsconfig.base.json` defines a path alias: `@mon-super-agent/agent-runtime` → `services/agent-runtime/src/index.ts`. `apps/api` imports the runtime via this package name; the runtime workspace itself currently has no runtime dependencies and exports plain types/factories. When adding code to `services/agent-runtime`, re-export it from `src/index.ts` or it won't be reachable from the API.

### External orchestration

The Notion-driven task runner that previously lived in `orchestration/` was extracted to <https://github.com/evausesgit/notion-orchestrator>. It runs as a separate Docker container and treats this repo as a target. Tasks reference `MSA-###` IDs from the Notion database `Mon Super Agent - Tasks`; those IDs are not git branches or PRs.

## Conventions worth knowing

- `dist/` directories are gitignored but present locally after builds; don't read them, read `src/`.
- `.env` is gitignored; `.env.example` lists the expected keys (`PORT`, `NEXT_PUBLIC_*`).
