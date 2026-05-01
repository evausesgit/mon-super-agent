# Onboarding Flow

## Goal

Describe the MVP onboarding path screen by screen so the team can implement it consistently across product, API, and messaging setup.

## Screen 1: Landing

- Promise: create your super agent in minutes.
- Primary action: `Create my super agent`.
- Secondary context: Telegram ships first, WhatsApp follows after the first stable provisioning flow.

## Screen 2: Agent Setup

Required fields:
- `Agent name`
- `Preferred channel`
- `User contact`

Validation rules:
- agent name is required
- contact is required
- Telegram expects a handle or deep-link-friendly identifier
- WhatsApp expects a phone-number-shaped contact

## Screen 3: Provisioning

- Show a pending state while the backend creates the agent record.
- Surface a deterministic next step based on the selected channel.

## Screen 4: Success

- Show the resulting agent id
- Show the selected channel
- Offer a direct link toward activation
- Offer a link to the agent detail page

## Failure State

- Explain whether the problem comes from validation or backend availability.
- Keep the entered values intact so the user can retry quickly.
