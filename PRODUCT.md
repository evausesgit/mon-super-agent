# Product

## Vision

Everyone wants a super agent, and everyone should be able to have their own.

Mon Super Agent lets a user come to a web page, ask to create their own agent, choose a messaging channel, and immediately begin talking to that agent from the messaging app they already use.

## Core Promise

Create your personal AI agent in minutes, then talk to it from Telegram or WhatsApp as naturally as you would talk to a trusted collaborator.

## Product Principles

- Simplicity first: the first-run experience should feel almost effortless.
- Personal ownership: each user feels they have their own agent, not a shared bot.
- Messaging native: the relationship starts on the web, but lives in chat.
- Fast time to value: the user should reach the first useful conversation quickly.

## MVP Goal

Deliver the shortest path from intent to first conversation:
1. the user lands on the web app
2. the user asks to create their super agent
3. the user chooses a communication channel
4. the system provisions the agent
5. the user receives or opens the new chat contact
6. the user starts talking to their agent

## Recommended MVP Scope

### In Scope

- a simple web onboarding flow
- account capture sufficient to provision an agent
- one supported messaging channel for the first release
- creation of a per-user agent identity
- a first conversational experience in the messaging app
- basic operational observability for provisioning success and failures

### Out of Scope

- multi-agent collaboration between users
- advanced billing and subscriptions
- shared team workspaces
- custom workflow builders
- long-term memory tuning UI
- broad marketplace or plugin ecosystem

## Strong Recommendation

Ship Telegram first.

Reasoning:
- lower integration friction
- fewer business onboarding constraints
- easier to test quickly
- better fit for an MVP whose main risk is product flow, not distribution plumbing

WhatsApp should remain a planned phase immediately after the first successful Telegram path.

## Primary User Journey

### Happy Path

1. User opens the site.
2. User clicks or types a call to action to create a super agent.
3. User gives the agent a name or accepts a default.
4. User chooses Telegram or WhatsApp.
5. User completes the minimum identity and channel setup.
6. System provisions the agent.
7. User sees a success state with a direct next action.
8. User opens the chat and sends the first message.

## User Experience Requirements

- no technical jargon in onboarding
- one decision at a time
- clear success state after provisioning
- graceful failure and retry path
- confidence that the created agent belongs to the user

## MVP Success Criteria

- a new user can complete setup without assistance
- time from landing page to first message is short and measurable
- provisioning failures are observable
- the first conversation starts in the selected messaging app

## Open Questions

- what identity model is required before creating an agent
- whether the first release needs authentication before agent creation
- how persistent the agent memory should be in MVP
- how the user reconnects to their agent from the web later

## Delivery Review Loop

Every orchestrated task should leave behind a concrete review surface in the repository.

For MVP delivery, the expected review artifacts are:
- a changed file or set of changed files
- a short execution summary in Notion
