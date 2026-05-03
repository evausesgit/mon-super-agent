import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

type Statement = {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
};

export type AgentDatabase = {
  close(): void;
  exec(sql: string): unknown;
  prepare(sql: string): Statement;
};

type DatabaseConstructor = new (databasePath: string) => AgentDatabase;

const DEFAULT_AGENT_DB_PATH = "./data/agents.db";

let defaultDatabase: AgentDatabase | undefined;
const require = createRequire(import.meta.url);

export function openAgentDatabase(
  databasePath = process.env.AGENT_DB_PATH ?? DEFAULT_AGENT_DB_PATH,
): AgentDatabase {
  ensureDatabaseDirectory(databasePath);

  const database = createDatabase(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      gateway_pid INTEGER,
      gateway_status TEXT NOT NULL DEFAULT 'provisioning',
      created_at INTEGER NOT NULL
    );
  `);

  return database;
}

export function getAgentDatabase(): AgentDatabase {
  defaultDatabase ??= openAgentDatabase();
  return defaultDatabase;
}

function ensureDatabaseDirectory(databasePath: string) {
  if (databasePath === ":memory:") {
    return;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function createDatabase(databasePath: string): AgentDatabase {
  try {
    const BetterSqlite3 = require("better-sqlite3") as DatabaseConstructor;
    return new BetterSqlite3(databasePath);
  } catch (error) {
    if (!isMissingBetterSqlite3(error)) {
      throw error;
    }

    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: DatabaseConstructor;
    };
    return new DatabaseSync(databasePath);
  }
}

function isMissingBetterSqlite3(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "MODULE_NOT_FOUND" &&
    error.message.includes("better-sqlite3")
  );
}
