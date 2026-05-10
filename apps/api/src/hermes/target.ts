import {
  spawn,
  spawnSync,
  type SpawnOptions,
  type SpawnSyncOptions,
} from "node:child_process";

function getHermesBin(): string {
  return process.env.HERMES_BIN ?? "/home/geekette/.local/bin/hermes";
}

export function spawnHermesSync(args: string[], options: SpawnSyncOptions = {}) {
  return spawnSync(getHermesBin(), args, options);
}

export function spawnHermes(args: string[], options: SpawnOptions = {}) {
  return spawn(getHermesBin(), args, options);
}
