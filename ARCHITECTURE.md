# Architecture

## Intent

This architecture is optimized for one thing: letting a user create a personal agent from the web and then continue the relationship through a messaging app.

## System Overview

```text
Web App -> Provisioning API -> Agent Runtime -> Messaging Connector
                    |                |
                    v                v
               Persistence      Conversation State
                    |
                    v
             Operational Telemetry
```

## Main Components

### `apps/web`

Responsibilities:
- onboarding flow
- channel selection
- setup confirmation
- later, agent management surfaces

Needs:
- simple form handling
- clean success and failure states
- API integration for provisioning

### `apps/api`

Responsibilities:
- receive provisioning requests
- validate user input
- create agent records
- call messaging setup flows
- expose status for frontend polling or callbacks

Needs:
- idempotent create flow
- clear error contracts
- audit-friendly event logging

### `services/agent-runtime`

Responsibilities:
- represent the per-user super agent
- manage agent configuration and memory boundaries
- route inbound user messages to the model layer
- persist conversation state and operational metadata

Needs:
- stable agent identity per user
- model abstraction
- storage for configuration and history

### Messaging Connector Layer

Responsibilities:
- provision the user-facing communication endpoint
- receive inbound messages
- deliver outbound replies

MVP recommendation:
- implement Telegram first
- keep WhatsApp behind an interface so it can follow without a rewrite

### Orchestration Layer

Responsibilities:
- connect structured work tracking to execution
- map Notion tasks to Symphony-style work items
- standardize statuses, dependencies, and outputs

Primary artifact:
- `WORKFLOW.md`

## MVP Data Model

### User

- internal user id
- contact identity
- selected channel
- provisioning status

### Agent

- internal agent id
- owner user id
- display name
- runtime config
- status

### Conversation Endpoint

- channel type
- channel-specific identifier
- activation state

### Message Event

- direction
- timestamp
- payload
- delivery status

## Architectural Decisions

### 1. Per-user agent identity

Each user should have a first-class agent record rather than sharing one global bot persona. This preserves the product promise and makes future memory and personalization possible.

### 2. Channel abstraction

The runtime should not know the details of Telegram or WhatsApp transport. It should operate through a connector interface.

### 3. Asynchronous provisioning

Provisioning should be modeled as an operation with status rather than a single synchronous request. This gives us room for retries, external API delays, and channel-specific steps.

### 4. Observable lifecycle

Every provisioning attempt should emit structured events so failures can be debugged without reading raw logs end to end.

## Recommended Near-Term Implementation Path

1. Define the product flow and state transitions.
2. Scaffold API contracts and runtime boundaries.
3. Implement Telegram provisioning and chat loop.
4. Add durable persistence.
5. Add WhatsApp as a second connector.

## Key Risks

- WhatsApp integration complexity may dominate early execution.
- The first-run UX may become too heavy if identity and channel setup are mixed together poorly.
- Agent ownership and reconnection flows may be underspecified.
- Orchestration may become noisy if Notion fields are not disciplined.

## Open Technical Questions

- which auth model should the web app use in MVP
- what persistence layer best fits the first release
- what runtime boundary separates orchestration from the live agent loop
- how provisioning callbacks should be modeled across connectors
