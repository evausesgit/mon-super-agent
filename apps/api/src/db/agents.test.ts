import { describe, expect, it } from "vitest";

import {
  getAgentById,
  insertAgent,
  listAgentsByPhoneNumber,
  listAgentsByOwnerId,
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
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
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

  it("persists agent language and voice", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-ryan",
        name: "Ryan",
        ownerId: "@eva",
        channel: "telegram",
        language: "en-GB",
        voice: "en-GB-RyanNeural",
      },
      database,
    );

    expect(getAgentById("agent-ryan", database)).toMatchObject({
      language: "en-GB",
      voice: "en-GB-RyanNeural",
    });

    database.close();
  });

  it("defaults language and voice to French/Vivienne when not specified", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-default",
        name: "Default",
        ownerId: "@eva",
        channel: "telegram",
      },
      database,
    );

    expect(getAgentById("agent-default", database)).toMatchObject({
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
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

  it("lists only agents owned by one normalized phone-number user id", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-alpha",
        name: "Alpha",
        ownerId: "+14155552671",
        channel: "telegram",
        createdAt: 1,
      },
      database,
    );
    insertAgent(
      {
        id: "agent-beta",
        name: "Beta",
        ownerId: "+14155552671",
        channel: "telegram",
        createdAt: 2,
      },
      database,
    );
    insertAgent(
      {
        id: "agent-other",
        name: "Other",
        ownerId: "+442071838750",
        channel: "telegram",
        createdAt: 3,
      },
      database,
    );

    expect(
      listAgentsByOwnerId("+14155552671", database).map((agent) => agent.id),
    ).toEqual(["agent-alpha", "agent-beta"]);
    expect(
      listAgentsByOwnerId("+442071838750", database).map((agent) => agent.id),
    ).toEqual(["agent-other"]);

    database.close();
  });

  it("normalizes phone-number filters before listing owned agents", () => {
    const database = openAgentDatabase(":memory:");

    insertAgent(
      {
        id: "agent-alpha",
        name: "Alpha",
        ownerId: "+14155552671",
        channel: "telegram",
        createdAt: 1,
      },
      database,
    );
    insertAgent(
      {
        id: "agent-beta",
        name: "Beta",
        ownerId: "+14155552671",
        channel: "telegram",
        createdAt: 2,
      },
      database,
    );
    insertAgent(
      {
        id: "agent-other",
        name: "Other",
        ownerId: "+442071838750",
        channel: "telegram",
        createdAt: 3,
      },
      database,
    );

    expect(
      listAgentsByPhoneNumber("+1 (415) 555-2671", database).map(
        (agent) => agent.id,
      ),
    ).toEqual(["agent-alpha", "agent-beta"]);
    expect(
      listAgentsByPhoneNumber("+44 20 7183 8750", database).map(
        (agent) => agent.id,
      ),
    ).toEqual(["agent-other"]);
    expect(() => listAgentsByPhoneNumber("415-555-2671", database)).toThrow(
      "Phone number must include an international country code",
    );

    database.close();
  });
});
