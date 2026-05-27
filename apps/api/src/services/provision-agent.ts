import {
  DEFAULT_AGENT_LANGUAGE,
  DEFAULT_AGENT_VOICE,
  createAgentRuntimeConfig,
} from "@mon-super-agent/agent-runtime";
import { createHermesProfile } from "../hermes/profile.js";

export type ProvisionAgentInput = {
  agentId: string;
  agentName: string;
  ownerId: string;
  telegramBotToken: string;
  provider?: string;
  model?: string;
  language?: string;
  voice?: string;
};

export function provisionAgent(input: ProvisionAgentInput): void {
  const runtimeConfig = createAgentRuntimeConfig({
    provider: input.provider,
    model: input.model,
  });

  createHermesProfile({
    ...input,
    provider: runtimeConfig.provider,
    model: runtimeConfig.model,
    language: input.language ?? DEFAULT_AGENT_LANGUAGE,
    voice: input.voice ?? DEFAULT_AGENT_VOICE,
  });
}
