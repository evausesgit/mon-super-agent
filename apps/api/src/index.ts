import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import { PhoneNumberValidationError } from "@mon-super-agent/agent-runtime";
import Fastify from "fastify";
import {
  getAgentById,
  insertAgent,
  listAgentsByPhoneNumber,
  updateGatewayStatus,
  type AgentRecord,
} from "./db/agents.js";
import { createOrResolveProfileByPhoneNumber } from "./db/profiles.js";
import { isGatewayRunning, reconcileGateways, startGateway } from "./hermes/gateway.js";
import { spawnHermesSync } from "./hermes/target.js";
import { createAgent, type CreateAgentResult } from "./routes/agents.js";

type AgentApiResponse = Omit<CreateAgentResult, "status"> & {
  status: string;
  gatewayPid: number | null;
};

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "mon-super-agent-api",
    };
  });

  app.get("/health/hermes", async () => {
    const bin = process.env.HERMES_BIN ?? "/home/geekette/.local/bin/hermes";
    const result = spawnHermesSync(["--version"], { stdio: "pipe" });
    const ok = result.status === 0;
    return {
      ok,
      bin,
      version: ok ? result.stdout?.toString().trim() : null,
      error: ok ? null : (result.stderr?.toString().trim() || (result as { error?: Error }).error?.message || "unknown error"),
    };
  });

  app.post("/profiles", async (request, reply) => {
    const body = request.body as {
      phoneNumber?: string;
    };

    if (!body.phoneNumber) {
      reply.code(400);
      return {
        error: "Missing required field: phoneNumber",
      };
    }

    try {
      return createOrResolveProfileByPhoneNumber(body.phoneNumber);
    } catch (error) {
      if (error instanceof PhoneNumberValidationError) {
        reply.code(400);
        return {
          error: error.message,
        };
      }

      throw error;
    }
  });

  app.post("/agents", async (request, reply) => {
    const body = request.body as {
      agentName?: string;
      channel?: "telegram" | "whatsapp";
      userContact?: string;
      telegramBotToken?: string;
      provider?: string;
      model?: string;
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

    let ownerId: string;

    try {
      const profile = createOrResolveProfileByPhoneNumber(body.userContact);
      ownerId = profile.id;
    } catch (error) {
      if (error instanceof PhoneNumberValidationError) {
        reply.code(400);
        return {
          error: error.message,
        };
      }

      throw error;
    }

    let agent: CreateAgentResult;

    try {
      agent = await createAgent({
        agentName: body.agentName,
        channel: body.channel,
        userContact: ownerId,
        telegramBotToken: body.telegramBotToken,
        provider: body.provider,
        model: body.model,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid Telegram bot token") {
        reply.code(400);
        return {
          error: "Invalid Telegram bot token",
        };
      }

      if (
        error instanceof Error &&
        (error.message.startsWith("Unsupported agent provider") ||
          error.message.startsWith("Unsupported model"))
      ) {
        reply.code(400);
        return {
          error: error.message,
        };
      }

      reply.code(500);
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }

    insertAgent({
      id: agent.id,
      name: agent.name,
      ownerId: agent.ownerId,
      channel: agent.channel,
      provider: agent.provider,
      model: agent.model,
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

  app.get("/agents", async (request, reply) => {
    const query = request.query as {
      phoneNumber?: string;
    };

    if (!query.phoneNumber) {
      reply.code(400);
      return {
        error: "Missing required query parameter: phoneNumber",
      };
    }

    try {
      return {
        agents: listAgentsByPhoneNumber(query.phoneNumber).map((agent) =>
          toAgentResponse(refreshGatewayStatus(agent)),
        ),
      };
    } catch (error) {
      if (error instanceof PhoneNumberValidationError) {
        reply.code(400);
        return {
          error: error.message,
        };
      }

      throw error;
    }
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

  return app;
}

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
    provider: agent.provider,
    model: agent.model,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = buildApp();

  reconcileGateways((msg) => app.log.info(msg));

  app.listen({
    port,
    host: "0.0.0.0",
  }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
