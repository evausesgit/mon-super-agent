# Symphony + Notion

## Goal

Use Notion as the visible task board and Symphony-style orchestration as the execution engine.

## Operating Model

Notion is where humans:
- create tasks
- prioritize tasks
- review blockers
- watch work move

The orchestration layer is where the system:
- picks ready tasks
- moves `Status`
- assigns `Run ID`
- writes `Agent Output`
- records which agent touched the task

## Required Notion Fields

The database now includes:
- `Status`
- `Blocked By`
- `Agent Output`
- `Run ID`
- `Last Updated By Agent`
- `Last Sync At`

These fields let the orchestrator make task movement visible in Notion.

## Task Selection Rule

The local runner should only pick tasks that are:
- `Status = Todo`
- in the target sprint, usually `MVP`
- not blocked by another task

## Status Transition Rule

The standard transition path is:

1. `Todo`
2. `In Progress`
3. `In Review` or `Done`

If execution cannot continue:

1. `Todo`
2. `In Progress`
3. `Blocked`

## Run Metadata

Every execution run should write:
- `Run ID`
- `Last Updated By Agent`
- `Last Sync At`
- `Agent Output`

## Local Code Structure

- `orchestration/src/task-types.ts`
- `orchestration/src/notion-adapter.ts`
- `orchestration/src/symphony-runner.ts`
- `orchestration/src/demo.ts`

## What Exists Today

The current repository contains:
- a typed task model
- an in-memory Notion adapter
- a live Notion REST adapter
- a runner that executes the next ready MVP task
- a demo script that simulates a task moving to `In Review`
- a repo-aware executor that can create reviewable file changes for supported tasks

## Next Step To Make Notion Move For Real

Use the live runner in `orchestration/src/run-live.ts` with:
- `NOTION_TOKEN`
- `NOTION_DATA_SOURCE_ID`
- `NOTION_API_VERSION`

Then run:

```bash
npm run orchestration:run-live
```

The live adapter:
- reads rows from the `Mon Super Agent - Tasks` data source
- selects the next ready MVP task
- updates the task page properties through the Notion REST API
- persists `Run ID`, `Status`, and `Agent Output`

For supported tasks, the live runner also:
- edits files in the repository
- writes a review artifact to `orchestration/runs/<run-id>.md`
- includes the changed files in the Notion summary so humans know what to inspect

## Autonomous Mode

The repository also supports a fully autonomous path:

```bash
npm run orchestration:run-autonomous
```

In this mode, the orchestrator:
- executes a supported task
- verifies the repo with `npm run lint` and `npm run build`
- commits the resulting diff
- pushes to `origin/main`
- marks the task `Done`
- writes the commit link back into Notion

## Suggested First Real Automation

Use `MSA-009` or `MSA-010` as the first real orchestrated task:
- pick it automatically when `Todo`
- move it to `In Progress`
- write a short agent summary
- move it to `In Review`
