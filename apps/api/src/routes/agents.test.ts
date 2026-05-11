import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizePhoneNumber } from "@mon-super-agent/agent-runtime";
import {
  getAgentById,
  insertAgent,
  listAgentsByPhoneNumber,
  listAllAgents,
  updateGatewayStatus,
} from "../db/agents.js";
import { createOrResolveProfileByPhoneNumber } from "../db/profiles.js";
import { isGatewayRunning, startGateway } from "../hermes/gateway.js";
import { createHermesProfile, getBotUsername } from "../hermes/profile.js";
import { buildApp } from "../index.js";
import { createAgent } from "./agents.js";

vi.mock("../db/agents.js", () => ({
  getAgentById: vi.fn(),
  insertAgent: vi.fn(),
  listAgentsByPhoneNumber: vi.fn(),
  listAllAgents: vi.fn(),
  updateGatewayStatus: vi.fn(),
}));

vi.mock("../db/profiles.js", async () => {
  const runtime = await import("@mon-super-agent/agent-runtime");

  return {
    createOrResolveProfileByPhoneNumber: vi.fn((phoneNumber: string) => {
      const normalizedPhoneNumber = runtime.normalizePhoneNumber(phoneNumber);

      return {
        id: normalizedPhoneNumber,
        phoneNumber: normalizedPhoneNumber,
        createdAt: 1_714_000_000_000,
      };
    }),
  };
});

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
const listAgentsByPhoneNumberMock = vi.mocked(listAgentsByPhoneNumber);
const listAllAgentsMock = vi.mocked(listAllAgents);
const createOrResolveProfileByPhoneNumberMock = vi.mocked(
  createOrResolveProfileByPhoneNumber,
);
const isGatewayRunningMock = vi.mocked(isGatewayRunning);
const startGatewayMock = vi.mocked(startGateway);
const updateGatewayStatusMock = vi.mocked(updateGatewayStatus);

beforeEach(() => {
  createHermesProfileMock.mockClear();
  getBotUsernameMock.mockReset();
  getBotUsernameMock.mockResolvedValue("mybot");
  getAgentByIdMock.mockReset();
  listAgentsByPhoneNumberMock.mockReset();
  listAgentsByPhoneNumberMock.mockImplementation((phoneNumber: string) => {
    normalizePhoneNumber(phoneNumber);
    return [];
  });
  listAllAgentsMock.mockReset();
  listAllAgentsMock.mockReturnValue([]);
  createOrResolveProfileByPhoneNumberMock.mockClear();
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
      userContact: "+1 (415) 555-2671",
      telegramBotToken: "1234567890:AAxxxxxx",
    });

    expect(result.id).toMatch(/^agent-nova-/);
    expect(result.name).toBe("Nova");
    expect(result.activationTarget).toBe("https://t.me/mybot");
    expect(getBotUsernameMock).toHaveBeenCalledWith("1234567890:AAxxxxxx");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: result.id,
      agentName: "Nova",
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
  });

  it("accepts a Telegram handle as the owner contact", async () => {
    const result = await createAgent({
      agentName: "Nova",
      channel: "telegram",
      userContact: " @acid3croco ",
      telegramBotToken: "1234567890:AAxxxxxx",
    });

    expect(result.ownerId).toBe("@acid3croco");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: result.id,
      agentName: "Nova",
      ownerId: "@acid3croco",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
  });

  it("creates a Codex profile with GPT-5.4", async () => {
    const result = await createAgent({
      agentName: "Nova",
      channel: "telegram",
      userContact: "+1 (415) 555-2671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
    });

    expect(result.provider).toBe("codex");
    expect(result.model).toBe("gpt-5.4");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: result.id,
      agentName: "Nova",
      ownerId: "+14155552671",
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
      ownerId: "+14155552671",
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

  it("continues to read legacy agents without phone-number profiles", async () => {
    getAgentByIdMock.mockReturnValue({
      id: "agent-legacy",
      name: "Legacy",
      ownerId: "@eva",
      channel: "telegram",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      gatewayPid: null,
      gatewayStatus: "active",
      createdAt: 1_714_000_000_000,
    });
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/agents/agent-legacy",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: "agent-legacy",
      ownerId: "@eva",
      status: "active",
    });

    await app.close();
  });
});

describe("GET /consumption", () => {
  it("returns estimated consumption for every persisted agent", async () => {
    listAllAgentsMock.mockReturnValue([
      {
        id: "agent-nova",
        name: "Nova",
        ownerId: "@eva",
        channel: "telegram",
        provider: "anthropic",
        model: "anthropic/claude-sonnet-4-6",
        gatewayPid: 1234,
        gatewayStatus: "active",
        createdAt: 1_714_000_000_000,
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/consumption",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      agents: [
        {
          agentId: "agent-nova",
          agentName: "Nova",
          monthlyTotalTokens: 4_500_000,
          estimatedMonthlyCostUsd: 24.3,
        },
      ],
      totals: {
        totalAgents: 1,
        totalMonthlyTokens: 4_500_000,
        totalEstimatedMonthlyCostUsd: 24.3,
      },
    });

    await app.close();
  });
});

describe("POST /profiles", () => {
  it("creates or resolves a profile from a phone number", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/profiles",
      payload: {
        phoneNumber: "+1 (415) 555-2671",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "+14155552671",
      phoneNumber: "+14155552671",
      createdAt: 1_714_000_000_000,
    });
    expect(createOrResolveProfileByPhoneNumberMock).toHaveBeenCalledWith(
      "+1 (415) 555-2671",
    );

    await app.close();
  });

  it("returns 400 for an ambiguous phone number", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/profiles",
      payload: {
        phoneNumber: "415-555-2671",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        "Phone number must include an international country code, for example +14155552671",
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
        userContact: "+14155552671",
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
        userContact: "+14155552671",
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
        userContact: "+1 (415) 555-2671",
        telegramBotToken: "1234567890:AAxxxxxx",
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.id).toMatch(/^agent-nova-/);
    expect(body.activationTarget).toBe("https://t.me/mybot");
    expect(createOrResolveProfileByPhoneNumberMock).toHaveBeenCalledWith(
      "+1 (415) 555-2671",
    );
    expect(getBotUsernameMock).toHaveBeenCalledWith("1234567890:AAxxxxxx");
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: body.id,
      agentName: "Nova",
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
    expect(insertAgentMock).toHaveBeenCalledWith({
      id: body.id,
      name: "Nova",
      ownerId: "+14155552671",
      channel: "telegram",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      gatewayStatus: "provisioning",
    });
    expect(startGatewayMock).toHaveBeenCalledWith(body.id);
    expect(updateGatewayStatusMock).toHaveBeenCalledWith(body.id, 1234, "active");

    await app.close();
  });

  it("creates a Telegram agent for a Telegram handle without requiring a phone number profile", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "@acid3croco",
        telegramBotToken: "1234567890:AAxxxxxx",
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.ownerId).toBe("@acid3croco");
    expect(createOrResolveProfileByPhoneNumberMock).not.toHaveBeenCalled();
    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: body.id,
      agentName: "Nova",
      ownerId: "@acid3croco",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
    expect(insertAgentMock).toHaveBeenCalledWith({
      id: body.id,
      name: "Nova",
      ownerId: "@acid3croco",
      channel: "telegram",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      gatewayStatus: "provisioning",
    });

    await app.close();
  });

  it("returns 400 for invalid phone numbers without creating partial agent records", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agents",
      payload: {
        agentName: "Nova",
        channel: "telegram",
        userContact: "415-555-2671",
        telegramBotToken: "1234567890:AAxxxxxx",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        "Phone number must include an international country code, for example +14155552671",
    });
    expect(getBotUsernameMock).not.toHaveBeenCalled();
    expect(createHermesProfileMock).not.toHaveBeenCalled();
    expect(insertAgentMock).not.toHaveBeenCalled();
    expect(startGatewayMock).not.toHaveBeenCalled();

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
        userContact: "+14155552671",
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
        userContact: "+14155552671",
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
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
    });
    expect(insertAgentMock).toHaveBeenCalledWith({
      id: body.id,
      name: "Nova",
      ownerId: "+14155552671",
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
        userContact: "+14155552671",
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
        userContact: "+14155552671",
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

describe("GET /agents", () => {
  it("lists all agents for one phone-number profile without cross-user leakage", async () => {
    listAgentsByPhoneNumberMock.mockReturnValue([
      {
        id: "agent-alpha",
        name: "Alpha",
        ownerId: "+14155552671",
        channel: "telegram",
        provider: "anthropic",
        model: "anthropic/claude-sonnet-4-6",
        gatewayPid: 1234,
        gatewayStatus: "active",
        createdAt: 1,
      },
      {
        id: "agent-beta",
        name: "Beta",
        ownerId: "+14155552671",
        channel: "telegram",
        provider: "codex",
        model: "gpt-5.4",
        gatewayPid: 5678,
        gatewayStatus: "active",
        createdAt: 2,
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/agents?phoneNumber=%2B1%20(415)%20555-2671",
    });

    expect(response.statusCode).toBe(200);
    expect(listAgentsByPhoneNumberMock).toHaveBeenCalledWith(
      "+1 (415) 555-2671",
    );
    expect(response.json()).toMatchObject({
      agents: [
        {
          id: "agent-alpha",
          ownerId: "+14155552671",
        },
        {
          id: "agent-beta",
          ownerId: "+14155552671",
        },
      ],
    });

    await app.close();
  });

  it("queries a different phone number with its own normalized owner id", async () => {
    listAgentsByPhoneNumberMock.mockReturnValue([]);
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/agents?phoneNumber=%2B44%2020%207183%208750",
    });

    expect(response.statusCode).toBe(200);
    expect(listAgentsByPhoneNumberMock).toHaveBeenCalledWith("+44 20 7183 8750");
    expect(response.json()).toEqual({
      agents: [],
    });

    await app.close();
  });

  it("rejects invalid phone-number filters", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/agents?phoneNumber=415-555-2671",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        "Phone number must include an international country code, for example +14155552671",
    });
    expect(listAgentsByPhoneNumberMock).toHaveBeenCalledWith("415-555-2671");

    await app.close();
  });
});
