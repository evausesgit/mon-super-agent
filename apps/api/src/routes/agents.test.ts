import { beforeEach, describe, expect, it, vi } from "vitest";

import { insertAgent, updateGatewayStatus } from "../db/agents.js";
import { startGateway } from "../hermes/gateway.js";
import { createHermesProfile } from "../hermes/profile.js";
import { buildApp } from "../index.js";
import { createAgent } from "./agents.js";

vi.mock("../db/agents.js", () => ({
  getAgentById: vi.fn(),
  insertAgent: vi.fn(),
  updateGatewayStatus: vi.fn(),
}));

vi.mock("../hermes/gateway.js", () => ({
  isGatewayRunning: vi.fn(),
  startGateway: vi.fn(() => ({ pid: 1234 })),
}));

vi.mock("../hermes/profile.js", () => ({
  createHermesProfile: vi.fn(),
}));

const createHermesProfileMock = vi.mocked(createHermesProfile);
const insertAgentMock = vi.mocked(insertAgent);
const startGatewayMock = vi.mocked(startGateway);
const updateGatewayStatusMock = vi.mocked(updateGatewayStatus);

beforeEach(() => {
  createHermesProfileMock.mockClear();
  insertAgentMock.mockClear();
  startGatewayMock.mockClear();
  updateGatewayStatusMock.mockClear();
});

describe("createAgent", () => {
  it("generates an id from the name", () => {
    const result = createAgent({
      agentName: "Nova",
      channel: "telegram",
      userContact: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
    });

    expect(result.id).toMatch(/^agent-nova-/);
    expect(result.name).toBe("Nova");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: result.id,
      agentName: "Nova",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
    });
  });
});

describe("POST /agents", () => {
  it("returns 400 without telegramBotToken", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@eva",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        "Missing required fields: agentName, channel, userContact, telegramBotToken",
    });
    expect(createHermesProfileMock).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns 400 without agentName", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        channel: "telegram",
        userContact: "@eva",
        telegramBotToken: "1234567890:AAxxxxxx",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        "Missing required fields: agentName, channel, userContact, telegramBotToken",
    });
    expect(createHermesProfileMock).not.toHaveBeenCalled();

    await app.close();
  });

  it("passes telegramBotToken to createHermesProfile", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@eva",
        telegramBotToken: "1234567890:AAxxxxxx",
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.id).toMatch(/^agent-nova-/);
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: body.id,
      agentName: "Nova",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
    });
    expect(insertAgentMock).toHaveBeenCalledWith({
      id: body.id,
      name: "Nova",
      ownerId: "@eva",
      channel: "telegram",
      gatewayStatus: "provisioning",
    });
    expect(startGatewayMock).toHaveBeenCalledWith(body.id);
    expect(updateGatewayStatusMock).toHaveBeenCalledWith(body.id, 1234, "active");

    await app.close();
  });
});
