# Mon Super Agent

Mon Super Agent is a product that lets anyone create their own personal AI agent from a simple web interface, choose WhatsApp or Telegram, and start talking to it immediately.

The product is scoped in `PRODUCT.md` and the system design lives in `ARCHITECTURE.md`.

## Repository Layout

```text
apps/
  api/                  Backend APIs for agent provisioning and channel setup
  web/                  User-facing onboarding and management experience
services/
  agent-runtime/        Long-lived agent runtime and orchestration logic
docs/                   Supporting product and technical notes
```

## Current Focus

The current phase is MVP definition:
- define the smallest lovable user journey
- decide whether Telegram ships before WhatsApp
- prepare the codebase for implementation

## Next Steps

- finalize MVP scope in `PRODUCT.md`
- validate the architecture in `ARCHITECTURE.md`
- scaffold the first implementation slice

## Related projects

The Notion-driven task orchestrator that previously lived in `orchestration/` was extracted to its own repo: <https://github.com/evausesgit/notion-orchestrator>. It is generic, ships as a Docker image, and can be pointed at any Notion database + git repository.
