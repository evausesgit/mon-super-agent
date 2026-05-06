import { describe, expect, it } from "vitest";

import {
  PhoneNumberValidationError,
  createAgentProfile,
  createAgentRuntimeConfig,
  normalizePhoneNumber,
} from "./index.js";

describe("agent runtime config", () => {
  it("defaults to the existing Anthropic launch configuration", () => {
    expect(createAgentRuntimeConfig({})).toEqual({
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
    });
  });

  it("uses GPT-5.4 when Codex is selected", () => {
    expect(createAgentRuntimeConfig({ provider: "codex" })).toEqual({
      provider: "codex",
      model: "gpt-5.4",
    });
  });

  it("rejects unsupported providers", () => {
    expect(() => createAgentRuntimeConfig({ provider: "openai" })).toThrow(
      'Unsupported agent provider "openai". Supported providers: anthropic, codex',
    );
  });

  it("rejects unsupported provider/model combinations", () => {
    expect(() =>
      createAgentRuntimeConfig({
        provider: "codex",
        model: "anthropic/claude-sonnet-4-6",
      }),
    ).toThrow(
      'Unsupported model "anthropic/claude-sonnet-4-6" for provider "codex". Supported models: gpt-5.4',
    );
  });
});

describe("createAgentProfile", () => {
  it("surfaces provider and model metadata", () => {
    expect(
      createAgentProfile({
        id: "agent-nova",
        name: "Nova",
        ownerId: "@eva",
        channel: "telegram",
        provider: "codex",
        model: "gpt-5.4",
      }),
    ).toMatchObject({
      provider: "codex",
      model: "gpt-5.4",
    });
  });
});

describe("normalizePhoneNumber", () => {
  it("normalizes E.164 phone numbers with common separators", () => {
    expect(normalizePhoneNumber("+1 (415) 555-2671")).toBe("+14155552671");
  });

  it("rejects ambiguous local phone numbers", () => {
    expect(() => normalizePhoneNumber("(415) 555-2671")).toThrow(
      PhoneNumberValidationError,
    );
    expect(() => normalizePhoneNumber("(415) 555-2671")).toThrow(
      "Phone number must include an international country code",
    );
  });

  it("rejects invalid E.164 phone numbers", () => {
    expect(() => normalizePhoneNumber("+1")).toThrow(
      "Phone number must be a valid E.164 number",
    );
  });
});
