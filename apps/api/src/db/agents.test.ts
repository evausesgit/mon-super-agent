import { describe, expect, it } from "vitest";

import {
  getAgentById,
  insertAgent,
  updateGatewayStatus,
} from "./agents.js";
import { openAgentDatabase } from "./schema.js";

describe("agent persistence", () => {
  it("inserts and reads an agent from an in-memory SQLite database", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-nova",
        name: "Nova",
        ownerId: "@eva",
        channel: "telegram",
        gatewayStatus: "provisioning",
        createdAt: 1_714_000_000_000,
      },
      database,
    );

    expect(getAgentById("agent-nova", database)).toEqual({
      id: "agent-nova",
      name: "Nova",
      ownerId: "@eva",
      channel: "telegram",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      gatewayPid: null,
      gatewayStatus: "provisioning",
      createdAt: 1_714_000_000_000,
    });

    database.close();
  });

  it("persists agent provider and model", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-codex",
        name: "Codex",
        ownerId: "@eva",
        channel: "telegram",
        provider: "codex",
        model: "gpt-5.4",
      },
      database,
    );

    expect(getAgentById("agent-codex", database)).toMatchObject({
      provider: "codex",
      model: "gpt-5.4",
    });

    database.close();
  });

  it("updates gateway pid and status", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-nova",
        name: "Nova",
        ownerId: "@eva",
        channel: "telegram",
      },
      database,
    );

    updateGatewayStatus("agent-nova", 1234, "active", database);

    expect(getAgentById("agent-nova", database)).toMatchObject({
      gatewayPid: 1234,
      gatewayStatus: "active",
    });

    database.close();
  });
});
