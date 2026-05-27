import { describe, expect, it } from "vitest";

import {
  PhoneNumberValidationError,
  createAgentProfile,
  createAgentRuntimeConfig,
  createAgentVoiceConfig,
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

describe("createAgentVoiceConfig", () => {
  it("defaults to French/Vivienne when no input is given", () => {
    expect(createAgentVoiceConfig({})).toEqual({
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
    });
  });

  it("defaults to the first voice for the selected language", () => {
    expect(createAgentVoiceConfig({ language: "en-GB" })).toEqual({
      language: "en-GB",
      voice: "en-GB-RyanNeural",
    });
  });

  it("accepts a valid language and voice combination", () => {
    expect(
      createAgentVoiceConfig({ language: "en-US", voice: "en-US-JennyNeural" }),
    ).toEqual({
      language: "en-US",
      voice: "en-US-JennyNeural",
    });
  });

  it("rejects an unsupported language", () => {
    expect(() => createAgentVoiceConfig({ language: "de-DE" })).toThrow(
      'Unsupported agent language "de-DE". Supported languages: fr-FR, en-GB, en-US',
    );
  });

  it("rejects a voice that does not belong to the selected language", () => {
    expect(() =>
      createAgentVoiceConfig({ language: "en-GB", voice: "fr-FR-VivienneMultilingualNeural" }),
    ).toThrow(
      'Unsupported voice "fr-FR-VivienneMultilingualNeural" for language "en-GB"',
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

  it("surfaces selected language and voice", () => {
    expect(
      createAgentProfile({
        id: "agent-nova",
        name: "Nova",
        ownerId: "@eva",
        channel: "telegram",
        language: "en-GB",
        voice: "en-GB-SoniaNeural",
      }),
    ).toMatchObject({
      language: "en-GB",
      voice: "en-GB-SoniaNeural",
    });
  });

  it("defaults to French/Vivienne when no language or voice is given", () => {
    expect(
      createAgentProfile({
        id: "agent-nova",
        name: "Nova",
        ownerId: "@eva",
        channel: "telegram",
      }),
    ).toMatchObject({
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
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
