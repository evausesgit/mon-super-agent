import type { AgentModel, AgentProvider } from "@mon-super-agent/agent-runtime";
import type { AgentRecord } from "../db/agents.js";
import type { ProfilePeriodUsage, ProfileUsage } from "../hermes/profile-usage.js";

export type PeriodConsumption = {
  sessions: number;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export type AgentConsumptionResult = {
  agentId: string;
  agentName: string;
  provider: AgentProvider;
  model: AgentModel;
  status: string;
  dataSource: "real" | "none";
  lastActivity: string | null;
  last30Days: PeriodConsumption;
  allTime: PeriodConsumption;
};

export type AgentsConsumptionResult = {
  agents: AgentConsumptionResult[];
  totals: {
    totalAgents: number;
    last30Days: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
    allTime: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  };
};

type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

const modelPricing: Record<AgentModel, ModelPricing> = {
  "anthropic/claude-sonnet-4-6": {
    inputUsdPerMillionTokens: 3,
    outputUsdPerMillionTokens: 15,
  },
  "gpt-5.4": {
    inputUsdPerMillionTokens: 2,
    outputUsdPerMillionTokens: 8,
  },
};

const emptyPeriod: PeriodConsumption = {
  sessions: 0,
  messages: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedCostUsd: 0,
};

export function computeAgentConsumption(
  agent: AgentRecord,
  profileUsage: ProfileUsage | null,
): AgentConsumptionResult {
  if (profileUsage === null) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      provider: agent.provider,
      model: agent.model,
      status: agent.gatewayStatus,
      dataSource: "none",
      lastActivity: null,
      last30Days: emptyPeriod,
      allTime: emptyPeriod,
    };
  }

  const pricing = modelPricing[agent.model];

  return {
    agentId: agent.id,
    agentName: agent.name,
    provider: agent.provider,
    model: agent.model,
    status: agent.gatewayStatus,
    dataSource: "real",
    lastActivity:
      profileUsage.lastActivity !== null
        ? new Date(profileUsage.lastActivity * 1000).toISOString()
        : null,
    last30Days: addCost(profileUsage.last30Days, pricing),
    allTime: addCost(profileUsage.allTime, pricing),
  };
}

export function computeAgentsConsumption(
  agents: AgentRecord[],
  usageMap: Map<string, ProfileUsage | null>,
): AgentsConsumptionResult {
  const agentsConsumption = agents.map((agent) =>
    computeAgentConsumption(agent, usageMap.get(agent.id) ?? null),
  );

  return {
    agents: agentsConsumption,
    totals: {
      totalAgents: agentsConsumption.length,
      last30Days: {
        inputTokens: agentsConsumption.reduce((sum, a) => sum + a.last30Days.inputTokens, 0),
        outputTokens: agentsConsumption.reduce((sum, a) => sum + a.last30Days.outputTokens, 0),
        estimatedCostUsd: roundCurrency(
          agentsConsumption.reduce((sum, a) => sum + a.last30Days.estimatedCostUsd, 0),
        ),
      },
      allTime: {
        inputTokens: agentsConsumption.reduce((sum, a) => sum + a.allTime.inputTokens, 0),
        outputTokens: agentsConsumption.reduce((sum, a) => sum + a.allTime.outputTokens, 0),
        estimatedCostUsd: roundCurrency(
          agentsConsumption.reduce((sum, a) => sum + a.allTime.estimatedCostUsd, 0),
        ),
      },
    },
  };
}

function addCost(period: ProfilePeriodUsage, pricing: ModelPricing): PeriodConsumption {
  return {
    sessions: period.sessions,
    messages: period.messages,
    inputTokens: period.inputTokens,
    outputTokens: period.outputTokens,
    estimatedCostUsd: roundCurrency(
      (period.inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
        (period.outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens,
    ),
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
