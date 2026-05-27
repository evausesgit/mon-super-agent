export const DEFAULT_AGENT_PROVIDER = "anthropic";
export const DEFAULT_AGENT_MODEL = "anthropic/claude-sonnet-4-6";

export type AgentProvider = "anthropic" | "codex";
export type AgentModel = "anthropic/claude-sonnet-4-6" | "gpt-5.4";

export type AgentLanguage = "fr-FR" | "en-GB" | "en-US";
export type AgentVoice =
  | "fr-FR-VivienneMultilingualNeural"
  | "fr-FR-RemyMultilingualNeural"
  | "en-GB-RyanNeural"
  | "en-GB-SoniaNeural"
  | "en-US-GuyNeural"
  | "en-US-JennyNeural";

export const DEFAULT_AGENT_LANGUAGE: AgentLanguage = "fr-FR";
export const DEFAULT_AGENT_VOICE: AgentVoice = "fr-FR-VivienneMultilingualNeural";

export type AgentRuntimeConfig = {
  provider: AgentProvider;
  model: AgentModel;
};

export class PhoneNumberValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneNumberValidationError";
  }
}

const supportedModelsByProvider = {
  anthropic: [DEFAULT_AGENT_MODEL],
  codex: ["gpt-5.4"],
} as const satisfies Record<AgentProvider, readonly AgentModel[]>;

const supportedVoicesByLanguage = {
  "fr-FR": ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"],
  "en-GB": ["en-GB-RyanNeural", "en-GB-SoniaNeural"],
  "en-US": ["en-US-GuyNeural", "en-US-JennyNeural"],
} as const satisfies Record<AgentLanguage, readonly AgentVoice[]>;

export function getSupportedAgentLanguages(): AgentLanguage[] {
  return Object.keys(supportedVoicesByLanguage) as AgentLanguage[];
}

export function getSupportedVoicesForLanguage(language: AgentLanguage): AgentVoice[] {
  return [...supportedVoicesByLanguage[language]];
}

export function getDefaultVoiceForLanguage(language: AgentLanguage): AgentVoice {
  return supportedVoicesByLanguage[language][0];
}

export function createAgentVoiceConfig(input: {
  language?: string;
  voice?: string;
}): { language: AgentLanguage; voice: AgentVoice } {
  const language = input.language ?? DEFAULT_AGENT_LANGUAGE;

  if (!isAgentLanguage(language)) {
    throw new Error(
      `Unsupported agent language "${language}". Supported languages: ${getSupportedAgentLanguages().join(", ")}`,
    );
  }

  const voice = input.voice ?? getDefaultVoiceForLanguage(language);

  if (!isSupportedVoiceForLanguage(language, voice)) {
    throw new Error(
      `Unsupported voice "${voice}" for language "${language}". Supported voices: ${getSupportedVoicesForLanguage(language).join(", ")}`,
    );
  }

  return { language, voice };
}

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

export function normalizePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    throw new PhoneNumberValidationError("Phone number is required");
  }

  if (!trimmed.startsWith("+")) {
    throw new PhoneNumberValidationError(
      "Phone number must include an international country code, for example +14155552671",
    );
  }

  const normalized = `+${trimmed.slice(1).replace(/[()\s.-]/g, "")}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new PhoneNumberValidationError(
      "Phone number must be a valid E.164 number with 8 to 15 digits after the country code",
    );
  }

  return normalized;
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

function isAgentLanguage(language: string): language is AgentLanguage {
  return language in supportedVoicesByLanguage;
}

function isSupportedVoiceForLanguage(
  language: AgentLanguage,
  voice: string,
): voice is AgentVoice {
  return getSupportedVoicesForLanguage(language).includes(voice as AgentVoice);
}

export type AgentProfile = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  provider: AgentProvider;
  model: AgentModel;
  language: AgentLanguage;
  voice: AgentVoice;
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
  language?: string;
  voice?: string;
  activationTarget?: string;
}): AgentProfile {
  const normalizedOwner = input.ownerId.trim();
  const runtimeConfig = createAgentRuntimeConfig({
    provider: input.provider,
    model: input.model,
  });
  const voiceConfig = createAgentVoiceConfig({
    language: input.language,
    voice: input.voice,
  });

  return {
    id: input.id,
    name: input.name,
    ownerId: normalizedOwner,
    channel: input.channel,
    provider: runtimeConfig.provider,
    model: runtimeConfig.model,
    language: voiceConfig.language,
    voice: voiceConfig.voice,
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
