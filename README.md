# Mon Super Agent

Mon Super Agent is a product that lets anyone create their own personal AI agent from a simple web interface, choose WhatsApp or Telegram, and start talking to it immediately.

This repository is organized around a Symphony-inspired workflow:
- work is tracked in Notion
- execution is documented in `WORKFLOW.md`
- the product is scoped in `PRODUCT.md`
- the system design lives in `ARCHITECTURE.md`

## Repository Layout

```text
apps/
  api/                  Backend APIs for agent provisioning and channel setup
  web/                  User-facing onboarding and management experience
services/
  agent-runtime/        Long-lived agent runtime and orchestration logic
orchestration/          Tracker mappings, operational conventions, runbooks
docs/                   Supporting product and technical notes
```

## Current Focus

The current phase is MVP definition and orchestration setup:
- define the smallest lovable user journey
- decide whether Telegram ships before WhatsApp
- map Notion tasks to a Symphony-style execution model
- prepare the codebase for implementation

## Working Model

The source of truth for planning is the Notion database `Mon Super Agent - Tasks`.

Each high-value work item should:
1. have a clear outcome
2. have acceptance criteria
3. map to one repo area
4. produce an artifact or code change

## Next Steps

- finalize MVP scope in `PRODUCT.md`
- validate the architecture in `ARCHITECTURE.md`
- operationalize the execution model in `WORKFLOW.md`
- then scaffold the first implementation slice
