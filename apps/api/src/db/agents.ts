import type { AgentDatabase } from "./schema.js";
import { getAgentDatabase } from "./schema.js";

export type AgentRecord = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  gatewayPid: number | null;
  gatewayStatus: string;
  createdAt: number;
};

export type InsertAgentInput = {
  id: string;
  name: string;
  ownerId: string;
  channel: "telegram" | "whatsapp";
  gatewayPid?: number | null;
  gatewayStatus?: string;
  createdAt?: number;
};

type AgentRow = {
  id: string;
  name: string;
  owner_id: string;
  channel: "telegram" | "whatsapp";
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
          gateway_pid,
          gateway_status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      agent.id,
      agent.name,
      agent.ownerId,
      agent.channel,
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
    gatewayPid: row.gateway_pid,
    gatewayStatus: row.gateway_status,
    createdAt: row.created_at,
  };
}
