import { createHermesProfile } from "../hermes/profile.js";

export type ProvisionAgentInput = {
  agentId: string;
  agentName: string;
  ownerId: string;
  telegramBotToken: string;
};

export function provisionAgent(input: ProvisionAgentInput): void {
  createHermesProfile(input);
}
