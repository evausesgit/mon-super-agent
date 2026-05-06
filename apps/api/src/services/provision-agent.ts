import { createAgentRuntimeConfig } from "@mon-super-agent/agent-runtime";
import { createHermesProfile } from "../hermes/profile.js";

export type ProvisionAgentInput = {
  agentId: string;
  agentName: string;
  ownerId: string;
  telegramBotToken: string;
  provider?: string;
  model?: string;
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
  });
}
