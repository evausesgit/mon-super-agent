import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  getAgentById,
  insertAgent,
  updateGatewayStatus,
  type AgentRecord,
} from "./db/agents.js";
import { isGatewayRunning, startGateway } from "./hermes/gateway.js";
import { createHermesProfile } from "./hermes/profile.js";
import { createAgent, type CreateAgentResult } from "./routes/agents.js";

type AgentApiResponse = Omit<CreateAgentResult, "status"> & {
  status: string;
  gatewayPid: number | null;
};

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => {
  return {
    ok: true,
    service: "mon-super-agent-api",
  };
});

app.post("/agents", async (request, reply) => {
  const body = request.body as {
    agentName?: string;
    channel?: "telegram" | "whatsapp";
    userContact?: string;
    telegramBotToken?: string;
  };

  if (
    !body.agentName ||
    !body.channel ||
    !body.userContact ||
    !body.telegramBotToken
  ) {
    reply.code(400);
    return {
      error:
        "Missing required fields: agentName, channel, userContact, telegramBotToken",
    };
  }

  const agent = createAgent(body as {
    agentName: string;
    channel: "telegram" | "whatsapp";
    userContact: string;
  });

  createHermesProfile({
    agentId: agent.id,
    agentName: agent.name,
    ownerId: agent.ownerId,
    telegramBotToken: body.telegramBotToken,
  });

  insertAgent({
    id: agent.id,
    name: agent.name,
    ownerId: agent.ownerId,
    channel: agent.channel,
    gatewayStatus: "provisioning",
  });

  const gateway = startGateway(agent.id);
  updateGatewayStatus(agent.id, gateway.pid, "active");

  reply.code(201);
  return {
    ...agent,
    status: "active",
    gatewayPid: gateway.pid,
  };
});

app.get("/agents/:id", async (request, reply) => {
  const params = request.params as { id: string };
  const agent = getAgentById(params.id);

  if (!agent) {
    reply.code(404);
    return {
      error: "Agent not found",
    };
  }

  return toAgentResponse(refreshGatewayStatus(agent));
});

function refreshGatewayStatus(agent: AgentRecord): AgentRecord {
  if (agent.gatewayPid === null) {
    return agent;
  }

  const status = isGatewayRunning(agent.gatewayPid) ? "active" : "stopped";

  if (status !== agent.gatewayStatus) {
    updateGatewayStatus(agent.id, agent.gatewayPid, status);
  }

  return {
    ...agent,
    gatewayStatus: status,
  };
}

function toAgentResponse(agent: AgentRecord): AgentApiResponse {
  return {
    id: agent.id,
    name: agent.name,
    ownerId: agent.ownerId,
    channel: agent.channel,
    status: agent.gatewayStatus,
    gatewayPid: agent.gatewayPid,
    recommendedChannel: agent.channel,
    activationTarget:
      agent.channel === "telegram"
        ? `https://t.me/${agent.ownerId.replace(/^@/, "")}`
        : agent.ownerId,
    nextStep:
      agent.channel === "telegram"
        ? "Open Telegram and start the first conversation with your agent."
        : "Complete the WhatsApp verification and opt-in flow before activation.",
  };
}

const port = Number(process.env.PORT ?? 4000);

app.listen({
  port,
  host: "0.0.0.0",
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
