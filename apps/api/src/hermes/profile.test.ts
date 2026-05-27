import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { execSync, spawnSync } from "node:child_process";
import { createHermesProfile, getBotUsername } from "./profile.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(() => ({ status: 0, stderr: Buffer.from("") })),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(execSync).mockClear();
});

describe("getBotUsername", () => {
  it("returns the Telegram bot username", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        result: {
          username: "mybot",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getBotUsername("1234567890:AAxxxxxx")).resolves.toBe("mybot");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot1234567890:AAxxxxxx/getMe",
    );
  });

  it("throws when Telegram responds with a non-ok HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(getBotUsername("bad-token")).rejects.toThrow(
      "Telegram getMe failed: 401",
    );
  });

  it("throws when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(getBotUsername("bad-token")).rejects.toThrow("Network error");
  });
});

describe("createHermesProfile", () => {
  it("writes the selected provider and model to the Hermes config", () => {
    const hermesHome = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-profile-"));
    vi.stubEnv("HERMES_HOME", hermesHome);

    createHermesProfile({
      agentId: "agent-codex",
      agentName: "Codex",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "codex",
      model: "gpt-5.4",
      language: "fr-FR",
      voice: "fr-FR-VivienneMultilingualNeural",
    });

    expect(
      fs.readFileSync(
        path.join(hermesHome, "profiles", "agent-codex", "config.yaml"),
        "utf8",
      ),
    ).toContain(`model:
  default: gpt-5.4
  provider: codex
`);
  });

  it("writes TTS provider and voice to the Hermes config", () => {
    const hermesHome = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-profile-"));
    vi.stubEnv("HERMES_HOME", hermesHome);

    createHermesProfile({
      agentId: "agent-ryan",
      agentName: "Ryan",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      language: "en-GB",
      voice: "en-GB-RyanNeural",
    });

    const config = fs.readFileSync(
      path.join(hermesHome, "profiles", "agent-ryan", "config.yaml"),
      "utf8",
    );
    expect(config).toContain("tts:");
    expect(config).toContain("  provider: edge");
    expect(config).toContain("    voice: en-GB-RyanNeural");
  });

  it("writes the language instruction to SOUL.md", () => {
    const hermesHome = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-profile-"));
    vi.stubEnv("HERMES_HOME", hermesHome);

    createHermesProfile({
      agentId: "agent-sonia",
      agentName: "Sonia",
      ownerId: "@eva",
      telegramBotToken: "1234567890:AAxxxxxx",
      provider: "anthropic",
      model: "anthropic/claude-sonnet-4-6",
      language: "en-GB",
      voice: "en-GB-SoniaNeural",
    });

    const soul = fs.readFileSync(
      path.join(hermesHome, "profiles", "agent-sonia", "SOUL.md"),
      "utf8",
    );
    expect(soul).toContain(
      "Respond in British English by default, unless the user explicitly asks for another language.",
    );
  });
});
