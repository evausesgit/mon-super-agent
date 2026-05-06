import {
  DEFAULT_AGENT_MODEL,
  DEFAULT_AGENT_PROVIDER,
} from "@mon-super-agent/agent-runtime";
import { createHermesProfile } from "../hermes/profile.js";

export type ProvisionAgentInput = {
  agentId: string;
  agentName: string;
  ownerId: string;
  telegramBotToken: string;
};

export function provisionAgent(input: ProvisionAgentInput): void {
  createHermesProfile({
    ...input,
    provider: DEFAULT_AGENT_PROVIDER,
    model: DEFAULT_AGENT_MODEL,
  });
}
