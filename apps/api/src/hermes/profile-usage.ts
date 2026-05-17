import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

type Statement = { get(...params: unknown[]): unknown };
type Database = { prepare(sql: string): Statement; close(): void };
type DatabaseConstructor = new (dbPath: string, opts?: object) => Database;

export type ProfilePeriodUsage = {
  sessions: number;
  messages: number;
  inputTokens: number;
  outputTokens: number;
};

export type ProfileUsage = {
  lastActivity: number | null;
  last30Days: ProfilePeriodUsage;
  allTime: ProfilePeriodUsage;
};

export function readProfileUsage(agentId: string, hermesHome?: string): ProfileUsage | null {
  const hermesRoot = hermesHome ?? process.env.HERMES_HOME ?? path.join(os.homedir(), ".hermes");
  const dbPath = path.join(hermesRoot, "profiles", agentId, "state.db");

  if (!fs.existsSync(dbPath)) {
    return null;
  }

  let db: Database | undefined;
  try {
    db = openReadOnly(dbPath);
    return queryUsage(db);
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

function openReadOnly(dbPath: string): Database {
  try {
    const BetterSqlite3 = require("better-sqlite3") as DatabaseConstructor;
    return new BetterSqlite3(dbPath, { readonly: true });
  } catch (error) {
    if (isMissingBetterSqlite3(error)) {
      const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseConstructor };
      return new DatabaseSync(dbPath, { readonly: true });
    }
    throw error;
  }
}

type SessionRow = {
  sessions: number;
  messages: number;
  input_tokens: number;
  output_tokens: number;
  last_activity: number | null;
};

function queryUsage(db: Database): ProfileUsage {
  const thirtyDaysAgo = Date.now() / 1000 - 30 * 24 * 3600;

  const allTime = db
    .prepare(
      `SELECT COUNT(*) AS sessions,
              COALESCE(SUM(message_count), 0) AS messages,
              COALESCE(SUM(input_tokens), 0) AS input_tokens,
              COALESCE(SUM(output_tokens), 0) AS output_tokens,
              MAX(started_at) AS last_activity
       FROM sessions`,
    )
    .get() as SessionRow;

  const last30Days = db
    .prepare(
      `SELECT COUNT(*) AS sessions,
              COALESCE(SUM(message_count), 0) AS messages,
              COALESCE(SUM(input_tokens), 0) AS input_tokens,
              COALESCE(SUM(output_tokens), 0) AS output_tokens,
              MAX(started_at) AS last_activity
       FROM sessions
       WHERE started_at >= ?`,
    )
    .get(thirtyDaysAgo) as SessionRow;

  return {
    lastActivity: allTime.last_activity,
    allTime: mapRow(allTime),
    last30Days: mapRow(last30Days),
  };
}

function mapRow(row: SessionRow): ProfilePeriodUsage {
  return {
    sessions: row.sessions,
    messages: row.messages,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
  };
}

function isMissingBetterSqlite3(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "MODULE_NOT_FOUND" &&
    error.message.includes("better-sqlite3")
  );
}
