import {
  spawn,
  spawnSync,
  type SpawnOptions,
  type SpawnSyncOptions,
} from "node:child_process";

const DEFAULT_HERMES_BIN = "/home/geekette/.local/bin/hermes";

function getHermesBin(): string {
  return process.env.HERMES_BIN ?? DEFAULT_HERMES_BIN;
}

export function spawnHermesSync(args: string[], options: SpawnSyncOptions = {}) {
  return spawnSync(getHermesBin(), args, options);
}

export function spawnHermes(args: string[], options: SpawnOptions = {}) {
  return spawn(getHermesBin(), args, options);
}
