import {
  spawn,
  spawnSync,
  type SpawnOptions,
  type SpawnSyncOptions,
} from "node:child_process";

const DEFAULT_HERMES_SSH_COMMAND = "ssh geekette@65.108.202.130 -p 54829";

export function getHermesSshCommand(): string | null {
  return (
    process.env.HERMES_SSH_COMMAND ??
    process.env.jakevaserver ??
    DEFAULT_HERMES_SSH_COMMAND
  );
}

export function isRemoteHermesTarget(): boolean {
  return getHermesSshCommand() !== null;
}

export function getRemoteHermesRoot(): string {
  return process.env.HERMES_HOME?.trim() || "$HOME/.hermes";
}

export function spawnHermesSync(args: string[], options: SpawnSyncOptions = {}) {
  const sshCommand = getHermesSshCommand();

  if (!sshCommand) {
    return spawnSync("hermes", args, options);
  }

  return spawnSync(...buildSshInvocation(sshCommand, shellJoin(["hermes", ...args])), options);
}

export function spawnHermes(args: string[], options: SpawnOptions = {}) {
  const sshCommand = getHermesSshCommand();

  if (!sshCommand) {
    return spawn("hermes", args, options);
  }

  return spawn(...buildSshInvocation(sshCommand, shellJoin(["hermes", ...args])), options);
}

export function runRemoteShellSync(command: string, options: SpawnSyncOptions = {}) {
  const sshCommand = getHermesSshCommand();

  if (!sshCommand) {
    throw new Error("Remote Hermes target is not configured");
  }

  return spawnSync(...buildSshInvocation(sshCommand, command), options);
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function remotePathQuote(value: string): string {
  if (value.startsWith("$HOME/")) {
    return `"${value.replace(/["`\\]/g, "\\$&")}"`;
  }

  return shellQuote(value);
}

function buildSshInvocation(sshCommand: string, remoteCommand: string): [string, string[]] {
  const [command, ...args] = splitCommand(sshCommand);
  return [command, [...args, `zsh -lic ${shellQuote(remoteCommand)}`]];
}

function shellJoin(values: string[]): string {
  return values.map(shellQuote).join(" ");
}

function splitCommand(command: string): string[] {
  const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];

  return parts.map((part) => {
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("'") && part.endsWith("'"))
    ) {
      return part.slice(1, -1);
    }

    return part;
  });
}
