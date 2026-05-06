export const DEFAULT_AGENT_PROVIDER = "anthropic";
export const DEFAULT_AGENT_MODEL = "anthropic/claude-sonnet-4-6";

export type AgentProvider = "anthropic" | "codex";
export type AgentModel = "anthropic/claude-sonnet-4-6" | "gpt-5.4";

export type AgentRuntimeConfig = {
  provider: AgentProvider;
  model: AgentModel;
};

const supportedModelsByProvider = {
  anthropic: [DEFAULT_AGENT_MODEL],
  codex: ["gpt-5.4"],
} as const satisfies Record<AgentProvider, readonly AgentModel[]>;

export function createAgentRuntimeConfig(input: {
  provider?: string;
  model?: string;
}): AgentRuntimeConfig {
  const provider = input.provider ?? DEFAULT_AGENT_PROVIDER;

  if (!isAgentProvider(provider)) {
    throw new Error(
      `Unsupported agent provider "${provider}". Supported providers: ${getSupportedAgentProviders().join(", ")}`,
    );
  }

  const model = input.model ?? getDefaultModelForProvider(provider);

  if (!isSupportedModelForProvider(provider, model)) {
    throw new Error(
      `Unsupported model "${model}" for provider "${provider}". Supported models: ${getSupportedModelsForProvider(provider).join(", ")}`,
    );
  }

  return {
    provider,
    model,
  };
}

export function getSupportedAgentProviders(): AgentProvider[] {
  return Object.keys(supportedModelsByProvider) as AgentProvider[];
}

export function getSupportedModelsForProvider(
  provider: AgentProvider,
): AgentModel[] {
  return [...supportedModelsByProvider[provider]];
}

function getDefaultModelForProvider(provider: AgentProvider): AgentModel {
  return supportedModelsByProvider[provider][0];
}

function isAgentProvider(provider: string): provider is AgentProvider {
  return provider in supportedModelsByProvider;
}

function isSupportedModelForProvider(
  provider: AgentProvider,
  model: string,
): model is AgentModel {
  return getSupportedModelsForProvider(provider).includes(model as AgentModel);
}

export type AgentProfile = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  provider: AgentProvider;
  model: AgentModel;
  status:
    | "draft"
    | "provisioning"
    | "ready"
    | "pending_verification"
    | "active";
  activationTarget: string;
  nextStep: string;
};

export function createAgentProfile(input: {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  provider?: string;
  model?: string;
  activationTarget?: string;
}): AgentProfile {
  const normalizedOwner = input.ownerId.trim();
  const runtimeConfig = createAgentRuntimeConfig({
    provider: input.provider,
    model: input.model,
  });

  return {
    id: input.id,
    name: input.name,
    ownerId: normalizedOwner,
    channel: input.channel,
    provider: runtimeConfig.provider,
    model: runtimeConfig.model,
    status: input.channel === "telegram" ? "ready" : "pending_verification",
    activationTarget:
      input.activationTarget ??
      (input.channel === "telegram"
        ? `https://t.me/${normalizedOwner.replace(/^@/, "")}`
        : normalizedOwner),
    nextStep:
      input.channel === "telegram"
        ? "Open Telegram and start the first conversation with your agent."
        : "Complete the WhatsApp verification and opt-in flow before activation.",
  };
}
