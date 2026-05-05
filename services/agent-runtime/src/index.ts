export type AgentProfile = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
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
  activationTarget?: string;
}): AgentProfile {
  const normalizedOwner = input.ownerId.trim();

  return {
    id: input.id,
    name: input.name,
    ownerId: normalizedOwner,
    channel: input.channel,
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
