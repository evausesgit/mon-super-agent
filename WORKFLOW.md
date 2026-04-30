# Workflow

## Purpose

This repository uses a Symphony-inspired execution model with Notion as the work tracker.

The goal is to turn structured tasks into reliable delivery:
- one work item
- one clear outcome
- one execution path
- one reviewable result

## Source of Truth

The Notion database `Mon Super Agent - Tasks` is the planning source of truth.

The repository is the delivery source of truth:
- code
- docs
- decisions
- operational conventions

## Core Operating Principle

A task is ready to execute when it has:
- a clear title
- a defined type
- a status
- acceptance criteria
- a repo area

Optional but encouraged:
- dependencies through `Blocked By`
- hierarchy through `Parent`
- links to outputs or follow-up artifacts

## Task Lifecycle

### `Inbox`

The item exists but is not yet shaped enough for execution.

### `Todo`

The item is clear enough to be picked up.

### `In Progress`

An agent or human is actively executing the task.

### `Blocked`

Execution cannot continue until a dependency, decision, or external condition is resolved.

### `In Review`

The work product exists and needs validation.

### `Done`

The acceptance criteria have been met and the result has been integrated.

## How We Execute Work

1. Pick the highest-priority unblocked item in `Todo`.
2. Confirm the acceptance criteria and repo area.
3. Produce the smallest complete artifact that moves the task to review.
4. Record the result in the repo and, when useful, in `Agent Output`.
5. Move the task to `In Review` or `Done`.

## Work Item Rules

Each task should map to one of these categories:
- `Epic`: a larger outcome made of multiple child items
- `Feature`: user-visible or system-visible capability
- `Task`: concrete delivery work
- `Research`: decision-shaping investigation
- `Bug`: correction of incorrect behavior
- `Ops`: operational or tooling work

## Repo Area Ownership

- `apps/web`: onboarding and future management UX
- `apps/api`: provisioning API and service boundaries
- `services/agent-runtime`: per-user agent runtime
- `orchestration`: tracker mappings and execution conventions
- `docs`: product, architecture, decisions, and notes

## Definition of Done

An item is `Done` when:
- its acceptance criteria are satisfied
- its artifact exists in the repository or linked output
- major assumptions are documented
- follow-up work is captured as new tasks if needed

## Review Expectations

Every substantial change should answer:
- what changed
- why it changed
- what remains uncertain
- what the next dependent step is

## Notion Discipline

- use `Inbox` for ideas, not active work
- use `Todo` only for shaped items
- use `Blocked By` instead of burying blockers in prose
- keep titles outcome-oriented
- store long-form details in the page body or linked docs

## Immediate Execution Order

Recommended first sequence:
1. `MSA-001` Define MVP for Mon Super Agent
2. `MSA-002` Choose first messaging platform
3. `MSA-007` Write `PRODUCT.md`
4. `MSA-008` Write `ARCHITECTURE.md`
5. `MSA-009` Write `WORKFLOW.md`
6. `MSA-010` Define Notion-to-Symphony operating model

## Future Evolution

If the project grows, this workflow can evolve toward:
- richer ticket automation
- agent-per-task execution
- automated handoffs and status transitions
- generated summaries back into Notion
