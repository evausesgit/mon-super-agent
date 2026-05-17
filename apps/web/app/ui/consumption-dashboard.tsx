"use client";

import { useEffect, useMemo, useState } from "react";

type PeriodConsumption = {
  sessions: number;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

type AgentConsumption = {
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  status: string;
  dataSource: "real" | "none";
  lastActivity: string | null;
  last30Days: PeriodConsumption;
  allTime: PeriodConsumption;
};

type PeriodTotals = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

type ConsumptionPayload = {
  agents: AgentConsumption[];
  totals: {
    totalAgents: number;
    last30Days: PeriodTotals;
    allTime: PeriodTotals;
  };
};

type Period = "last30Days" | "allTime";

const emptyPeriodTotals: PeriodTotals = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
const emptyPayload: ConsumptionPayload = {
  agents: [],
  totals: { totalAgents: 0, last30Days: emptyPeriodTotals, allTime: emptyPeriodTotals },
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
  const [period, setPeriod] = useState<Period>("last30Days");

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
      setError("Impossible de charger la consommation pour le moment.");
    }
  }

  useEffect(() => {
    void fetchConsumption();
    const interval = setInterval(fetchConsumption, 10_000);
    return () => clearInterval(interval);
  }, []);

  const periodTotals = payload.totals[period];

  const mostExpensiveAgent = useMemo(() => {
    const withData = payload.agents.filter((a) => a.dataSource === "real");
    return [...withData].sort(
      (a, b) => b[period].estimatedCostUsd - a[period].estimatedCostUsd,
    )[0];
  }, [payload.agents, period]);

  return (
    <section className="consumption-shell" aria-label="Agent consumption">
      <div className="consumption-period-toggle">
        <button
          className={period === "last30Days" ? "period-btn active" : "period-btn"}
          onClick={() => setPeriod("last30Days")}
        >
          30 derniers jours
        </button>
        <button
          className={period === "allTime" ? "period-btn active" : "period-btn"}
          onClick={() => setPeriod("allTime")}
        >
          Tout l&apos;historique
        </button>
      </div>

      <div className="consumption-summary-grid">
        <article className="panel consumption-summary-card">
          <p className="section-label">Agents</p>
          <strong>{payload.totals.totalAgents}</strong>
          <span>agents suivis</span>
        </article>
        <article className="panel consumption-summary-card">
          <p className="section-label">Tokens</p>
          <strong>{tokenFormatter.format(periodTotals.inputTokens + periodTotals.outputTokens)}</strong>
          <span>entrée + sortie</span>
        </article>
        <article className="panel consumption-summary-card">
          <p className="section-label">Coût estimé</p>
          <strong>{currencyFormatter.format(periodTotals.estimatedCostUsd)}</strong>
          <span>basé sur les tokens réels</span>
        </article>
      </div>

      {mostExpensiveAgent && (
        <article className="panel consumption-highlight">
          <p className="section-label">Agent le plus consommateur</p>
          <h2>{mostExpensiveAgent.agentName}</h2>
          <p>
            {currencyFormatter.format(mostExpensiveAgent[period].estimatedCostUsd)} ·{" "}
            {tokenFormatter.format(
              mostExpensiveAgent[period].inputTokens + mostExpensiveAgent[period].outputTokens,
            )}{" "}
            tokens · {mostExpensiveAgent[period].sessions} sessions
          </p>
        </article>
      )}

      <article className="panel consumption-table-card">
        <div className="consumption-table-header">
          <div>
            <p className="section-label">Détail par agent</p>
            <h2>Consommation réelle</h2>
          </div>
          {lastUpdated && <span>Mis à jour à {lastUpdated.toLocaleTimeString()}</span>}
        </div>

        {error ? (
          <p className="form-error">{error}</p>
        ) : payload.agents.length === 0 ? (
          <p className="souls-empty">Aucun agent pour le moment.</p>
        ) : (
          <div className="consumption-list">
            {payload.agents.map((agent) => {
              const data = agent[period];
              return (
                <div className="consumption-row" key={agent.agentId}>
                  <div>
                    <h3>{agent.agentName}</h3>
                    <p>
                      {agent.provider} · {agent.model} · {agent.status}
                    </p>
                    {agent.lastActivity && (
                      <p className="helper-copy">
                        Dernière activité :{" "}
                        {new Date(agent.lastActivity).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  {agent.dataSource === "none" ? (
                    <p className="helper-copy consumption-no-data">Pas encore de données</p>
                  ) : (
                    <dl>
                      <div>
                        <dt>Sessions</dt>
                        <dd>{data.sessions}</dd>
                      </div>
                      <div>
                        <dt>Messages</dt>
                        <dd>{data.messages}</dd>
                      </div>
                      <div>
                        <dt>Input tokens</dt>
                        <dd>{tokenFormatter.format(data.inputTokens)}</dd>
                      </div>
                      <div>
                        <dt>Output tokens</dt>
                        <dd>{tokenFormatter.format(data.outputTokens)}</dd>
                      </div>
                      <div>
                        <dt>Coût estimé</dt>
                        <dd>{currencyFormatter.format(data.estimatedCostUsd)}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="helper-copy consumption-note">
          Données lues depuis les logs Hermes par profil. Le coût est estimé à partir des tokens
          réels et des tarifs configurés par modèle.
        </p>
      </article>
    </section>
  );
}
