import cors from "@fastify/cors";
import Fastify from "fastify";
import { createAgent, type CreateAgentResult } from "./routes/agents.js";
import { provisionAgent } from "./services/provision-agent.js";

const app = Fastify({
  logger: true,
});

const agents = new Map<string, CreateAgentResult>();

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

  provisionAgent({
    agentId: agent.id,
    agentName: agent.name,
    ownerId: agent.ownerId,
    telegramBotToken: body.telegramBotToken,
  });

  agents.set(agent.id, agent);
  reply.code(201);
  return agent;
});

app.get("/agents/:id", async (request, reply) => {
  const params = request.params as { id: string };
  const agent = agents.get(params.id);

  if (!agent) {
    reply.code(404);
    return {
      error: "Agent not found",
    };
  }

  return agent;
});

const port = Number(process.env.PORT ?? 4000);

app.listen({
  port,
  host: "0.0.0.0",
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
