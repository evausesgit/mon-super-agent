"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

type AgentCreationResponse = {
  id: string;
  name: string;
  status: "ready" | "pending_verification";
  recommendedChannel: "telegram" | "whatsapp";
  provider: "anthropic" | "codex";
  model: "anthropic/claude-sonnet-4-6" | "gpt-5.4";
  nextStep: string;
  activationTarget: string;
};

type ErrorResponse = {
  error?: string;
};

const defaultValues = {
  agentName: "",
  userContact: "",
  channel: "telegram",
  telegramBotToken: "",
  provider: "codex",
  model: "gpt-5.4",
};

export function AgentCreationForm() {
  const [formValues, setFormValues] = useState(defaultValues);
  const [result, setResult] = useState<AgentCreationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/agents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formValues),
          },
        );

        const payload = (await response.json()) as
          | AgentCreationResponse
          | ErrorResponse;

        if (!response.ok) {
          setResult(null);
          setErrorMessage(
            "error" in payload ? payload.error ?? "Provisioning failed." : "Provisioning failed.",
          );
          return;
        }

        setResult(payload as AgentCreationResponse);
      } catch {
        setResult(null);
        setErrorMessage(
          "The API is not reachable yet. Start the backend and try again.",
        );
      }
    });
  }

  return (
    <div className="agent-form-card">
      <form className="agent-form" onSubmit={handleSubmit}>
        <label>
          Agent name
          <input
            name="agentName"
            placeholder="Nova, Atlas, Sora..."
            required
            value={formValues.agentName}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                agentName: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Your contact
          <input
            name="userContact"
            placeholder={
              formValues.channel === "telegram" ? "@telegram_handle" : "+33612345678"
            }
            required
            value={formValues.userContact}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                userContact: event.target.value,
              }))
            }
          />
        </label>

        {formValues.channel === "telegram" ? (
          <label>
            Telegram Bot Token
            <input
              name="telegramBotToken"
              placeholder="1234567890:AAxxxxxx"
              required
              value={formValues.telegramBotToken}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  telegramBotToken: event.target.value,
                }))
              }
            />
            <small>
              Obtiens ton token sur{" "}
              <a href="https://t.me/BotFather" rel="noreferrer" target="_blank">
                @BotFather
              </a>{" "}
              -&gt; /newbot
            </small>
          </label>
        ) : null}

        <fieldset>
          <legend>Preferred channel</legend>

          <label className="choice-card">
            <input
              checked={formValues.channel === "telegram"}
              name="channel"
              type="radio"
              value="telegram"
              onChange={() =>
                setFormValues((current) => ({
                  ...current,
                  channel: "telegram",
                }))
              }
            />
            <div>
              <strong>Telegram</strong>
              <span>Lowest-friction MVP path</span>
            </div>
          </label>

          <label className="choice-card choice-card--disabled">
            <input
              disabled
              name="channel"
              type="radio"
              value="whatsapp"
            />
            <div>
              <strong>WhatsApp</strong>
              <span className="coming-soon">Coming soon</span>
            </div>
          </label>
        </fieldset>

        <fieldset>
          <legend>Runtime provider</legend>

          <label className="choice-card">
            <input
              checked={formValues.provider === "codex"}
              name="provider"
              type="radio"
              value="codex"
              onChange={() =>
                setFormValues((current) => ({
                  ...current,
                  provider: "codex",
                  model: "gpt-5.4",
                }))
              }
            />
            <div>
              <strong>Codex</strong>
              <span>gpt-5.4</span>
            </div>
          </label>

          <label className="choice-card choice-card--disabled">
            <input
              disabled
              name="provider"
              type="radio"
              value="anthropic"
            />
            <div>
              <strong>Anthropic</strong>
              <span className="coming-soon">Coming soon</span>
            </div>
          </label>
        </fieldset>

        <button className="primary-action submit-action" disabled={isPending} type="submit">
          {isPending ? "Creating..." : "Create my super agent"}
        </button>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </form>

      <aside className="result-card" aria-live="polite">
        <p className="section-label">Provisioning result</p>
        {result ? (
          <>
            <h3>{result.id}</h3>
            <p>
              Agent: <strong>{result.name}</strong>
            </p>
            <p>
              Status: <strong>{result.status}</strong>
            </p>
            <p>
              Channel: <strong>{result.recommendedChannel}</strong>
            </p>
            <p>
              Runtime: <strong>{result.provider}/{result.model}</strong>
            </p>
            <p>{result.nextStep}</p>
            {result.recommendedChannel === "telegram" ? (
              <a
                className="activation-link"
                href={result.activationTarget}
                rel="noreferrer"
                target="_blank"
              >
                Open Telegram target
              </a>
            ) : (
              <p className="activation-target">
                Activation target: {result.activationTarget}
              </p>
            )}
            <Link className="detail-link" href={`/agents/${result.id}`}>
              Open agent detail page
            </Link>
          </>
        ) : (
          <>
            <h3>No agent created yet</h3>
            <p>
              Submit the form to simulate provisioning and validate the first
              product loop.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
