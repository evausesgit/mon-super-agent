import { describe, expect, it } from "vitest";

import { estimateAgentConsumption } from "./usage.js";

const createdAt = Date.UTC(2026, 0, 1);

describe("estimateAgentConsumption", () => {
  it("estimates monthly usage and cost for an active Anthropic agent", () => {
    const result = estimateAgentConsumption({
      id: "agent-nova",
      name: "Nova",
      ownerId: "@eva",
      channel: "telegram",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      gatewayPid: 1234,
      gatewayStatus: "active",
      createdAt,
    });

    expect(result).toMatchObject({
      agentId: "agent-nova",
      agentName: "Nova",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      status: "active",
      dailyMessages: 80,
      monthlyInputTokens: 3_600_000,
      monthlyOutputTokens: 900_000,
      monthlyTotalTokens: 4_500_000,
      estimatedMonthlyCostUsd: 24.3,
    });
  });

  it("returns zero consumption for stopped agents", () => {
    const result = estimateAgentConsumption({
      id: "agent-sleeping",
      name: "Sleeping",
      ownerId: "@eva",
      channel: "telegram",
      provider: "codex",
      model: "gpt-5.4",
      gatewayPid: null,
      gatewayStatus: "stopped",
      createdAt,
    });

    expect(result.dailyMessages).toBe(0);
    expect(result.monthlyTotalTokens).toBe(0);
    expect(result.estimatedMonthlyCostUsd).toBe(0);
  });
});
