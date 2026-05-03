import { spawn } from "node:child_process";

export function startGateway(profileId: string): { pid: number } {
  const child = spawn(
    "hermes",
    ["--profile", profileId, "gateway", "run", "--replace"],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  child.unref();

  if (!child.pid) {
    throw new Error(`Failed to start Hermes gateway for profile "${profileId}"`);
  }

  return {
    pid: child.pid,
  };
}

export function isGatewayRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
