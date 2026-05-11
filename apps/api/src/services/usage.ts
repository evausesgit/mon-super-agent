import type { AgentModel, AgentProvider } from "@mon-super-agent/agent-runtime";
import type { AgentRecord } from "../db/agents.js";

export type AgentConsumptionEstimate = {
  agentId: string;
  agentName: string;
  provider: AgentProvider;
  model: AgentModel;
  status: string;
  dailyMessages: number;
  monthlyInputTokens: number;
  monthlyOutputTokens: number;
  monthlyTotalTokens: number;
  estimatedMonthlyCostUsd: number;
  pricingNote: string;
};

type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

const monthlyUsageByStatus: Record<string, { dailyMessages: number }> = {
  active: { dailyMessages: 80 },
  provisioning: { dailyMessages: 10 },
};

const averageTokensPerMessage = {
  input: 1_500,
  output: 375,
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

export function estimateAgentConsumption(
  agent: AgentRecord,
): AgentConsumptionEstimate {
  const dailyMessages = monthlyUsageByStatus[agent.gatewayStatus]?.dailyMessages ?? 0;
  const monthlyMessages = dailyMessages * 30;
  const monthlyInputTokens = monthlyMessages * averageTokensPerMessage.input;
  const monthlyOutputTokens = monthlyMessages * averageTokensPerMessage.output;
  const pricing = modelPricing[agent.model];
  const estimatedMonthlyCostUsd = roundCurrency(
    (monthlyInputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
      (monthlyOutputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens,
  );

  return {
    agentId: agent.id,
    agentName: agent.name,
    provider: agent.provider,
    model: agent.model,
    status: agent.gatewayStatus,
    dailyMessages,
    monthlyInputTokens,
    monthlyOutputTokens,
    monthlyTotalTokens: monthlyInputTokens + monthlyOutputTokens,
    estimatedMonthlyCostUsd,
    pricingNote:
      "Estimate based on current agent status, 30 days/month, average tokens per message, and configured model pricing.",
  };
}

export function estimateAgentsConsumption(agents: AgentRecord[]) {
  const agentsConsumption = agents.map(estimateAgentConsumption);
  const totalEstimatedMonthlyCostUsd = roundCurrency(
    agentsConsumption.reduce(
      (total, agent) => total + agent.estimatedMonthlyCostUsd,
      0,
    ),
  );
  const totalMonthlyTokens = agentsConsumption.reduce(
    (total, agent) => total + agent.monthlyTotalTokens,
    0,
  );

  return {
    agents: agentsConsumption,
    totals: {
      totalAgents: agentsConsumption.length,
      totalMonthlyTokens,
      totalEstimatedMonthlyCostUsd,
    },
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
