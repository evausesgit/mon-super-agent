"use client";

import { useEffect, useMemo, useState } from "react";

type AgentConsumption = {
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  status: string;
  dailyMessages: number;
  monthlyInputTokens: number;
  monthlyOutputTokens: number;
  monthlyTotalTokens: number;
  estimatedMonthlyCostUsd: number;
  pricingNote: string;
};

type ConsumptionPayload = {
  agents: AgentConsumption[];
  totals: {
    totalAgents: number;
    totalMonthlyTokens: number;
    totalEstimatedMonthlyCostUsd: number;
  };
};

const emptyPayload: ConsumptionPayload = {
  agents: [],
  totals: {
    totalAgents: 0,
    totalMonthlyTokens: 0,
    totalEstimatedMonthlyCostUsd: 0,
  },
};

const tokenFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ConsumptionDashboard() {
  const [payload, setPayload] = useState<ConsumptionPayload>(emptyPayload);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchConsumption() {
    try {
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/consumption`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Consumption API unavailable");
      }

      const data = (await res.json()) as ConsumptionPayload;
      setPayload(data);
      setLastUpdated(new Date());
    } catch {
      setPayload(emptyPayload);
      setError("Impossible de charger l’estimation de consommation pour le moment.");
    }
  }

  useEffect(() => {
    void fetchConsumption();
    const interval = setInterval(fetchConsumption, 10_000);
    return () => clearInterval(interval);
  }, []);

  const mostExpensiveAgent = useMemo(() => {
    return [...payload.agents].sort(
      (a, b) => b.estimatedMonthlyCostUsd - a.estimatedMonthlyCostUsd,
    )[0];
  }, [payload.agents]);

  return (
    <section className="consumption-shell" aria-label="Agent consumption estimates">
      <div className="consumption-summary-grid">
        <article className="panel consumption-summary-card">
          <p className="section-label">Agents</p>
          <strong>{payload.totals.totalAgents}</strong>
          <span>agents suivis</span>
        </article>
        <article className="panel consumption-summary-card">
          <p className="section-label">Tokens / mois</p>
          <strong>{tokenFormatter.format(payload.totals.totalMonthlyTokens)}</strong>
          <span>entrée + sortie estimées</span>
        </article>
        <article className="panel consumption-summary-card">
          <p className="section-label">Coût / mois</p>
          <strong>{currencyFormatter.format(payload.totals.totalEstimatedMonthlyCostUsd)}</strong>
          <span>budget prévisionnel</span>
        </article>
      </div>

      {mostExpensiveAgent && (
        <article className="panel consumption-highlight">
          <p className="section-label">Agent le plus consommateur</p>
          <h2>{mostExpensiveAgent.agentName}</h2>
          <p>
            {currencyFormatter.format(mostExpensiveAgent.estimatedMonthlyCostUsd)} / mois · {tokenFormatter.format(mostExpensiveAgent.monthlyTotalTokens)} tokens
          </p>
        </article>
      )}

      <article className="panel consumption-table-card">
        <div className="consumption-table-header">
          <div>
            <p className="section-label">Détail par agent</p>
            <h2>Consommation estimée</h2>
          </div>
          {lastUpdated && <span>Mis à jour à {lastUpdated.toLocaleTimeString()}</span>}
        </div>

        {error ? (
          <p className="form-error">{error}</p>
        ) : payload.agents.length === 0 ? (
          <p className="souls-empty">Aucun agent pour le moment.</p>
        ) : (
          <div className="consumption-list">
            {payload.agents.map((agent) => (
              <div className="consumption-row" key={agent.agentId}>
                <div>
                  <h3>{agent.agentName}</h3>
                  <p>{agent.provider} · {agent.model} · {agent.status}</p>
                </div>
                <dl>
                  <div>
                    <dt>Messages / jour</dt>
                    <dd>{agent.dailyMessages}</dd>
                  </div>
                  <div>
                    <dt>Input tokens / mois</dt>
                    <dd>{tokenFormatter.format(agent.monthlyInputTokens)}</dd>
                  </div>
                  <div>
                    <dt>Output tokens / mois</dt>
                    <dd>{tokenFormatter.format(agent.monthlyOutputTokens)}</dd>
                  </div>
                  <div>
                    <dt>Coût estimé / mois</dt>
                    <dd>{currencyFormatter.format(agent.estimatedMonthlyCostUsd)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}

        <p className="helper-copy consumption-note">
          Estimation basée sur le statut actuel de l’agent, un mois de 30 jours,
          une moyenne de tokens par message et les prix configurés par modèle.
        </p>
      </article>
    </section>
  );
}
