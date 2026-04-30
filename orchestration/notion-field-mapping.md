# Notion Field Mapping

## Purpose

This document maps the Notion tracker to a Symphony-style orchestration model.

## Field Mapping

| Notion Field | Meaning | Orchestration Use |
| --- | --- | --- |
| `Title` | Human-readable work item | Primary task name |
| `ID` | Stable human identifier | External reference |
| `Status` | Lifecycle stage | Scheduling and visibility |
| `Priority` | Relative urgency | Queue ordering |
| `Type` | Shape of work | Execution style |
| `Platform` | Functional surface | Routing and grouping |
| `Owner` | Human owner | Accountability |
| `Description` | Short task summary | Execution context |
| `Acceptance Criteria` | Required outcome | Completion gate |
| `Agent Output` | Result summary | Review handoff |
| `Repo Area` | Primary code or docs zone | Workspace targeting |
| `Link` | Related artifact | Cross-reference |
| `Due` | Optional target date | Planning signal |
| `Sprint` | Planning bucket | Scope grouping |
| `Parent` | Hierarchical relationship | Epic to child mapping |
| `Blocked By` | Dependency relationship | Execution gating |

## Status Semantics

- `Inbox`: not ready for execution
- `Todo`: ready to execute
- `In Progress`: actively being worked
- `Blocked`: waiting on a dependency or decision
- `In Review`: output exists and needs validation
- `Done`: accepted and integrated

## Execution Semantics

### Research

Expected output:
- a recommendation
- tradeoffs
- explicit decision impact

### Task

Expected output:
- a concrete artifact such as a doc, config, or code change

### Feature

Expected output:
- an implemented capability or an implementation-ready design

### Epic

Expected output:
- a coordinated set of child items and a clear completion narrative

## Practical Conventions

- prefer one primary `Repo Area` even if the task touches more than one zone
- use `Agent Output` for short reviewable summaries, not full reports
- create a new task instead of bloating one task with multiple outcomes
