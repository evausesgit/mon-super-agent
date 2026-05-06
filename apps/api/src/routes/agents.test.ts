import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAgentById, insertAgent, updateGatewayStatus } from "../db/agents.js";
import { isGatewayRunning, startGateway } from "../hermes/gateway.js";
import { createHermesProfile, getBotUsername } from "../hermes/profile.js";
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
  getBotUsername: vi.fn(),
}));

const createHermesProfileMock = vi.mocked(createHermesProfile);
const getBotUsernameMock = vi.mocked(getBotUsername);
const getAgentByIdMock = vi.mocked(getAgentById);
const insertAgentMock = vi.mocked(insertAgent);
const isGatewayRunningMock = vi.mocked(isGatewayRunning);
const startGatewayMock = vi.mocked(startGateway);
const updateGatewayStatusMock = vi.mocked(updateGatewayStatus);

beforeEach(() => {
  createHermesProfileMock.mockClear();
  getBotUsernameMock.mockReset();
  getBotUsernameMock.mockResolvedValue("mybot");
  getAgentByIdMock.mockReset();
  insertAgentMock.mockClear();
  isGatewayRunningMock.mockReset();
  isGatewayRunningMock.mockReturnValue(true);
  startGatewayMock.mockClear();
  updateGatewayStatusMock.mockClear();
});

describe("createAgent", () => {
  it("generates an id from the name", async () => {
    const result = await createAgent({
      agentName: "Nova",
      channel: "telegram",
      userContact: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
    });

    expect(result.id).toMatch(/^agent-nova-/);
    expect(result.name).toBe("Nova");
    expect(result.activationTarget).toBe("https://t.me/mybot");
    expect(getBotUsernameMock).toHaveBeenCalledWith("1234567890:AAxxxxxx");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: result.id,
      agentName: "Nova",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
  });

  it("creates a Codex profile with GPT-5.4", async () => {
    const result = await createAgent({
      agentName: "Nova",
      channel: "telegram",
      userContact: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
    });

    expect(result.provider).toBe("codex");
    expect(result.model).toBe("gpt-5.4");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: result.id,
      agentName: "Nova",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
    });
  });
});

describe("GET /agents/:id", () => {
  it("surfaces the persisted provider and model", async () => {
    getAgentByIdMock.mockReturnValue({
      id: "agent-codex",
      name: "Codex",
      ownerId: "@eva",
      channel: "telegram",
      provider: "codex",
      model: "gpt-5.4",
      gatewayPid: 1234,
      gatewayStatus: "active",
      createdAt: 1_714_000_000_000,
    });
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/agents/agent-codex",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: "agent-codex",
      provider: "codex",
      model: "gpt-5.4",
    });

    await app.close();
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
    expect(body.activationTarget).toBe("https://t.me/mybot");
    expect(getBotUsernameMock).toHaveBeenCalledWith("1234567890:AAxxxxxx");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: body.id,
      agentName: "Nova",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
    expect(insertAgentMock).toHaveBeenCalledWith({
      id: body.id,
      name: "Nova",
      ownerId: "@eva",
      channel: "telegram",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      gatewayStatus: "provisioning",
    });
    expect(startGatewayMock).toHaveBeenCalledWith(body.id);
    expect(updateGatewayStatusMock).toHaveBeenCalledWith(body.id, 1234, "active");

    await app.close();
  });

  it("returns 400 with an invalid telegramBotToken", async () => {
    getBotUsernameMock.mockRejectedValue(new Error("Telegram getMe failed: 401"));
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@eva",
        telegramBotToken: "bad-token",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Invalid Telegram bot token",
    });
    expect(createHermesProfileMock).not.toHaveBeenCalled();
    expect(insertAgentMock).not.toHaveBeenCalled();
    expect(startGatewayMock).not.toHaveBeenCalled();

    await app.close();
  });

  it("launches a Codex agent with GPT-5.4 and persists the runtime config", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@eva",
        telegramBotToken: "1234567890:AAxxxxxx",
        provider: "codex",
        model: "gpt-5.4",
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.provider).toBe("codex");
    expect(body.model).toBe("gpt-5.4");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: body.id,
      agentName: "Nova",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
    });
    expect(insertAgentMock).toHaveBeenCalledWith({
      id: body.id,
      name: "Nova",
      ownerId: "@eva",
      channel: "telegram",
      provider: "codex",
      model: "gpt-5.4",
      gatewayStatus: "provisioning",
    });
    expect(startGatewayMock).toHaveBeenCalledWith(body.id);

    await app.close();
  });

  it("returns 400 with an unsupported provider", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@eva",
        telegramBotToken: "1234567890:AAxxxxxx",
        provider: "openai",
        model: "gpt-5.4",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        'Unsupported agent provider "openai". Supported providers: anthropic, codex',
    });
    expect(createHermesProfileMock).not.toHaveBeenCalled();
    expect(insertAgentMock).not.toHaveBeenCalled();
    expect(startGatewayMock).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns 400 with an unsupported model for the selected provider", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@eva",
        telegramBotToken: "1234567890:AAxxxxxx",
        provider: "codex",
        model: "anthropic/claude-sonnet-4-6",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        'Unsupported model "anthropic/claude-sonnet-4-6" for provider "codex". Supported models: gpt-5.4',
    });
    expect(createHermesProfileMock).not.toHaveBeenCalled();
    expect(insertAgentMock).not.toHaveBeenCalled();
    expect(startGatewayMock).not.toHaveBeenCalled();

    await app.close();
  });
});
