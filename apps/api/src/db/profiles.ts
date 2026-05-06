import { normalizePhoneNumber } from "@mon-super-agent/agent-runtime";
import type { AgentDatabase } from "./schema.js";
import { getAgentDatabase } from "./schema.js";

export type UserProfileRecord = {
  id: string;
  phoneNumber: string;
  createdAt: number;
};

type UserProfileRow = {
  id: string;
  phone_number: string;
  created_at: number;
};

export function createOrResolveProfileByPhoneNumber(
  phoneNumber: string,
  database: AgentDatabase = getAgentDatabase(),
): UserProfileRecord {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const existing = getProfileByPhoneNumber(normalizedPhoneNumber, database);

  if (existing) {
    return existing;
  }

  const createdAt = Date.now();

  database
    .prepare(
      `
        INSERT OR IGNORE INTO user_profiles (
          id,
          phone_number,
          created_at
        ) VALUES (?, ?, ?)
      `,
    )
    .run(normalizedPhoneNumber, normalizedPhoneNumber, createdAt);

  return getProfileByPhoneNumber(normalizedPhoneNumber, database) ?? {
    id: normalizedPhoneNumber,
    phoneNumber: normalizedPhoneNumber,
    createdAt,
  };
}

export function getProfileByPhoneNumber(
  phoneNumber: string,
  database: AgentDatabase = getAgentDatabase(),
): UserProfileRecord | undefined {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const row = database
    .prepare("SELECT * FROM user_profiles WHERE phone_number = ?")
    .get(normalizedPhoneNumber) as UserProfileRow | undefined;

  return row ? mapProfileRow(row) : undefined;
}

function mapProfileRow(row: UserProfileRow): UserProfileRecord {
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
  };
}
