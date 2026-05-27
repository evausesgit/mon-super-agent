import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnHermesSync } from "./target.js";

const HERMES_AGENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function languageInstruction(language: string): string {
  switch (language) {
    case "fr-FR":
      return "Respond in French by default, unless the user explicitly asks for another language.";
    case "en-GB":
      return "Respond in British English by default, unless the user explicitly asks for another language.";
    case "en-US":
      return "Respond in American English by default, unless the user explicitly asks for another language.";
    default:
      return "Respond in the user's preferred language by default.";
  }
}

export type CreateHermesProfileInput = {
  agentId: string;
  agentName: string;
  ownerId: string;
  telegramBotToken: string;
  provider: string;
  model: string;
  language: string;
  voice: string;
};

export async function getBotUsername(botToken: string): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);

  if (!res.ok) {
    throw new Error(`Telegram getMe failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    ok: boolean;
    result: { username: string };
  };

  if (!data.ok) {
    throw new Error("Telegram getMe returned ok=false");
  }

  return data.result.username;
}

export function createHermesProfile(input: CreateHermesProfileInput): void {
  if (!HERMES_AGENT_ID_PATTERN.test(input.agentId)) {
    throw new Error(
      `Invalid Hermes agent id "${input.agentId}". Expected ${HERMES_AGENT_ID_PATTERN.source}`,
    );
  }

  const hermesRoot =
    process.env.HERMES_HOME ?? path.join(os.homedir(), ".hermes");
  const profileDir = path.join(hermesRoot, "profiles", input.agentId);

  const result = spawnHermesSync(["profile", "create", input.agentId], { stdio: "pipe" });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim() ?? "";
    const spawnError = (result as { error?: Error }).error?.message ?? "";
    throw new Error(`hermes profile create failed (bin: ${process.env.HERMES_BIN ?? "/root/.local/bin/hermes"}): ${stderr || spawnError}`);
  }

  fs.mkdirSync(profileDir, { recursive: true });

  fs.writeFileSync(
    path.join(profileDir, "config.yaml"),
    `model:
  default: ${input.model}
  provider: ${input.provider}
toolsets:
- hermes-cli
agent:
  max_turns: 90
tts:
  provider: edge
  edge:
    voice: ${input.voice}
`,
  );

  fs.writeFileSync(
    path.join(profileDir, "SOUL.md"),
    `You are ${input.agentName}, a personal AI super agent. Be warm, concise, and genuinely helpful. You belong to ${input.ownerId} and exist to make their life easier.

${languageInstruction(input.language)}

When sending voice messages, use the configured TTS voice for spoken replies.
`,
  );

  fs.writeFileSync(
    path.join(profileDir, ".env"),
    `TELEGRAM_BOT_TOKEN=${input.telegramBotToken}
TELEGRAM_ALLOWED_USERS=*
ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ?? ""}
`,
  );
}
