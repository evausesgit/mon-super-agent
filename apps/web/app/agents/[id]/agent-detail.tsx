"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AgentRecord = {
  id: string;
  name: string;
  status: "ready" | "pending_verification";
  recommendedChannel: "telegram" | "whatsapp";
  nextStep: string;
  activationTarget: string;
};

export function AgentDetail({ id }: { id: string }) {
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgent() {
      try {
        setError(null);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/agents/${id}`,
        );

        if (!response.ok) {
          setAgent(null);
          setError("This agent was not found in the provisioning service.");
          return;
        }

        const payload = (await response.json()) as AgentRecord;
        setAgent(payload);
      } catch {
        setAgent(null);
        setError("The API is not reachable yet. Start the backend and refresh.");
      }
    }

    void loadAgent();
  }, [id]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Agent Detail</p>
        <h1>Your super agent is taking shape.</h1>
        <p className="hero-copy">
          This page is the next stop after creation. It gives the user a stable
          place to review provisioning state and continue activation.
        </p>
        <div className="hero-actions">
          <Link className="primary-action" href="/">
            Back to creation flow
          </Link>
        </div>
      </section>

      <section className="detail-shell">
        <article className="result-card detail-card">
          <p className="section-label">Provisioning state</p>
          {agent ? (
            <>
              <h2>{agent.name}</h2>
              <p>
                Agent id: <strong>{agent.id}</strong>
              </p>
              <p>
                Status: <strong>{agent.status}</strong>
              </p>
              <p>
                Channel: <strong>{agent.recommendedChannel}</strong>
              </p>
              <p>{agent.nextStep}</p>
              {agent.recommendedChannel === "telegram" ? (
                <a
                  className="activation-link"
                  href={agent.activationTarget}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Telegram target
                </a>
              ) : (
                <p className="activation-target">
                  Activation target: {agent.activationTarget}
                </p>
              )}
            </>
          ) : (
            <>
              <h2>Loading agent</h2>
              <p>{error ?? "Fetching current provisioning information..."}</p>
            </>
          )}
        </article>
      </section>
    </main>
  );
}

