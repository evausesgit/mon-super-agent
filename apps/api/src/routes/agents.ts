import { createAgentProfile, type AgentProfile } from "@mon-super-agent/agent-runtime";
import { createHermesProfile, getBotUsername } from "../hermes/profile.js";

export type CreateAgentInput = {
  agentName: string;
  channel: "telegram" | "whatsapp";
  userContact: string;
  telegramBotToken: string;
  provider?: string;
  model?: string;
};

export type CreateAgentResult = AgentProfile & {
  recommendedChannel: "telegram" | "whatsapp";
};

export async function createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
  const id = createHermesAgentId(input.agentName);
  let botUsername: string;

  try {
    botUsername = await getBotUsername(input.telegramBotToken);
  } catch {
    throw new Error("Invalid Telegram bot token");
  }

  const profile = createAgentProfile({
    id,
    name: input.agentName.trim(),
    ownerId: input.userContact,
    channel: input.channel,
    provider: input.provider,
    model: input.model,
    activationTarget: `https://t.me/${botUsername}`,
  });

  createHermesProfile({
    agentId: profile.id,
    agentName: profile.name,
    ownerId: profile.ownerId,
    telegramBotToken: input.telegramBotToken,
    provider: profile.provider,
    model: profile.model,
  });

  return {
    ...profile,
    recommendedChannel: input.channel,
  };
}

function createHermesAgentId(agentName: string) {
  const timestamp = Date.now().toString();
  const prefix = "agent";
  const separatorLength = 2;
  const maxSlugLength = 64 - prefix.length - timestamp.length - separatorLength;
  const slug = slugify(agentName).slice(0, maxSlugLength);

  return `${prefix}-${slug}-${timestamp}`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "agent";
}
