import { describe, expect, it } from "vitest";
import { computeAgentConsumption } from "./usage.js";

const baseAgent = {
  id: "agent-nova",
  name: "Nova",
  ownerId: "@eva",
  channel: "telegram" as const,
  provider: "codex" as const,
  model: "gpt-5.4" as const,
  gatewayPid: 1234,
  gatewayStatus: "active",
  createdAt: Date.UTC(2026, 0, 1),
};

describe("computeAgentConsumption", () => {
  it("returns no-data result when profileUsage is null", () => {
    const result = computeAgentConsumption(baseAgent, null);
    expect(result.dataSource).toBe("none");
    expect(result.lastActivity).toBeNull();
    expect(result.last30Days.estimatedCostUsd).toBe(0);
    expect(result.allTime.inputTokens).toBe(0);
  });

  it("computes cost from real token data for gpt-5.4 ($2/M in, $8/M out)", () => {
    const result = computeAgentConsumption(baseAgent, {
      lastActivity: 1747483487,
      last30Days: {
        sessions: 5,
        messages: 30,
        inputTokens: 1_000_000,
        outputTokens: 100_000,
      },
      allTime: {
        sessions: 10,
        messages: 60,
        inputTokens: 2_000_000,
        outputTokens: 200_000,
      },
    });

    expect(result.dataSource).toBe("real");
    expect(result.last30Days.sessions).toBe(5);
    expect(result.last30Days.messages).toBe(30);
    // 1M * $2 + 0.1M * $8 = $2 + $0.80 = $2.80
    expect(result.last30Days.estimatedCostUsd).toBe(2.8);
    // 2M * $2 + 0.2M * $8 = $4 + $1.60 = $5.60
    expect(result.allTime.estimatedCostUsd).toBe(5.6);
  });

  it("computes cost correctly for anthropic/claude-sonnet-4-6 ($3/M in, $15/M out)", () => {
    const agent = {
      ...baseAgent,
      provider: "anthropic" as const,
      model: "anthropic/claude-sonnet-4-6" as const,
    };
    const result = computeAgentConsumption(agent, {
      lastActivity: 1747483487,
      last30Days: {
        sessions: 1,
        messages: 10,
        inputTokens: 1_000_000,
        outputTokens: 100_000,
      },
      allTime: {
        sessions: 1,
        messages: 10,
        inputTokens: 1_000_000,
        outputTokens: 100_000,
      },
    });
    // 1M * $3 + 0.1M * $15 = $3 + $1.50 = $4.50
    expect(result.last30Days.estimatedCostUsd).toBe(4.5);
  });

  it("sets lastActivity as ISO string from unix timestamp", () => {
    const result = computeAgentConsumption(baseAgent, {
      lastActivity: 1747483487,
      last30Days: { sessions: 0, messages: 0, inputTokens: 0, outputTokens: 0 },
      allTime: { sessions: 0, messages: 0, inputTokens: 0, outputTokens: 0 },
    });
    expect(result.lastActivity).toBe(new Date(1747483487 * 1000).toISOString());
  });
});
