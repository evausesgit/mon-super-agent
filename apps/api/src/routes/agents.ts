import { createAgentProfile, type AgentProfile } from "@mon-super-agent/agent-runtime";

export type CreateAgentInput = {
  agentName: string;
  channel: "telegram" | "whatsapp";
  userContact: string;
};

export type CreateAgentResult = AgentProfile & {
  recommendedChannel: "telegram" | "whatsapp";
};

export function createAgent(input: CreateAgentInput): CreateAgentResult {
  const id = `agent_${slugify(input.agentName)}_${Date.now()}`;
  const profile = createAgentProfile({
    id,
    name: input.agentName.trim(),
    ownerId: input.userContact,
    channel: input.channel,
  });

  return {
    ...profile,
    recommendedChannel: input.channel,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
