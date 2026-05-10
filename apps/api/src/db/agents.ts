import {
  DEFAULT_AGENT_MODEL,
  DEFAULT_AGENT_PROVIDER,
  normalizePhoneNumber,
  type AgentModel,
  type AgentProvider,
} from "@mon-super-agent/agent-runtime";
import type { AgentDatabase } from "./schema.js";
import { getAgentDatabase } from "./schema.js";

export type AgentRecord = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  provider: AgentProvider;
  model: AgentModel;
  gatewayPid: number | null;
  gatewayStatus: string;
  createdAt: number;
};

export type InsertAgentInput = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  provider?: AgentProvider;
  model?: AgentModel;
  gatewayPid?: number | null;
  gatewayStatus?: string;
  createdAt?: number;
};

type AgentRow = {
  id: string;
  name: string;
  owner_id: string;
  channel: "telegram" | "whatsapp";
  provider: AgentProvider;
  model: AgentModel;
  gateway_pid: number | null;
  gateway_status: string;
  created_at: number;
};

export function insertAgent(
  agent: InsertAgentInput,
  database: AgentDatabase = getAgentDatabase(),
): void {
  database
    .prepare(
      `
        INSERT INTO agents (
          id,
          name,
          owner_id,
          channel,
          provider,
          model,
          gateway_pid,
          gateway_status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      agent.id,
      agent.name,
      agent.ownerId,
      agent.channel,
      agent.provider ?? DEFAULT_AGENT_PROVIDER,
      agent.model ?? DEFAULT_AGENT_MODEL,
      agent.gatewayPid ?? null,
      agent.gatewayStatus ?? "provisioning",
      agent.createdAt ?? Date.now(),
    );
}

export function getAgentById(
  id: string,
  database: AgentDatabase = getAgentDatabase(),
): AgentRecord | undefined {
  const row = database
    .prepare("SELECT * FROM agents WHERE id = ?")
    .get(id) as AgentRow | undefined;

  return row ? mapAgentRow(row) : undefined;
}

export function listAgentsByOwnerId(
  ownerId: string,
  database: AgentDatabase = getAgentDatabase(),
): AgentRecord[] {
  const rows = database
    .prepare("SELECT * FROM agents WHERE owner_id = ? ORDER BY created_at ASC")
    .all(ownerId) as AgentRow[];

  return rows.map(mapAgentRow);
}

export function listActiveAgents(
  database: AgentDatabase = getAgentDatabase(),
): AgentRecord[] {
  const rows = database
    .prepare("SELECT * FROM agents WHERE gateway_status = 'active' ORDER BY created_at ASC")
    .all() as AgentRow[];

  return rows.map(mapAgentRow);
}

export function listAgentsByPhoneNumber(
  phoneNumber: string,
  database: AgentDatabase = getAgentDatabase(),
): AgentRecord[] {
  return listAgentsByOwnerId(normalizePhoneNumber(phoneNumber), database);
}

export function updateGatewayStatus(
  id: string,
  pid: number | null,
  status: string,
  database: AgentDatabase = getAgentDatabase(),
): void {
  database
    .prepare(
      `
        UPDATE agents
        SET gateway_pid = ?, gateway_status = ?
        WHERE id = ?
      `,
    )
    .run(pid, status, id);
}

function mapAgentRow(row: AgentRow): AgentRecord {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    channel: row.channel,
    provider: row.provider,
    model: row.model,
    gatewayPid: row.gateway_pid,
    gatewayStatus: row.gateway_status,
    createdAt: row.created_at,
  };
}
