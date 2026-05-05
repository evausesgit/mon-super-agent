import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HERMES_AGENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export type CreateHermesProfileInput = {
  agentId: string;
  agentName: string;
  ownerId: string;
  telegramBotToken: string;
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

  execSync(`hermes profile create ${input.agentId}`, { stdio: "inherit" });

  fs.mkdirSync(profileDir, { recursive: true });

  fs.writeFileSync(
    path.join(profileDir, "config.yaml"),
    `model:
  default: anthropic/claude-sonnet-4-6
  provider: anthropic
toolsets:
- hermes-cli
agent:
  max_turns: 90
`,
  );

  fs.writeFileSync(
    path.join(profileDir, "SOUL.md"),
    `You are ${input.agentName}, a personal AI super agent. Be warm, concise, and genuinely helpful. You belong to ${input.ownerId} and exist to make their life easier.
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
