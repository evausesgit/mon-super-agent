import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHermesProfile } from "../hermes/profile.js";
import { provisionAgent } from "./provision-agent.js";

vi.mock("../hermes/profile.js", () => ({
  createHermesProfile: vi.fn(),
}));

const createHermesProfileMock = vi.mocked(createHermesProfile);

describe("provisionAgent", () => {
  beforeEach(() => {
    createHermesProfileMock.mockClear();
  });

  it("keeps the existing Anthropic default launch configuration", () => {
    provisionAgent({
      agentId: "agent-nova",
      agentName: "Nova",
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
    });

    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: "agent-nova",
      agentName: "Nova",
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
    });
  });

  it("passes Codex with GPT-5.4 to the Hermes launch boundary", () => {
    provisionAgent({
      agentId: "agent-codex",
      agentName: "Codex",
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
    });

    expect(createHermesProfileMock).toHaveBeenCalledWith({
      agentId: "agent-codex",
      agentName: "Codex",
      ownerId: "+14155552671",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
    });
  });

  it("rejects unsupported provider/model launch configurations", () => {
    expect(() =>
      provisionAgent({
        agentId: "agent-codex",
        agentName: "Codex",
        ownerId: "+14155552671",
        telegramBotToken: "1234567890:AAxxxxxx",
        provider: "codex",
        model: "anthropic/claude-sonnet-4-6",
      }),
    ).toThrow(
      'Unsupported model "anthropic/claude-sonnet-4-6" for provider "codex". Supported models: gpt-5.4',
    );
  });
});
