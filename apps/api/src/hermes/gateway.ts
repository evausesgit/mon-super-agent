import { listActiveAgents, updateGatewayStatus } from "../db/agents.js";
import { spawnHermes } from "./target.js";

export function startGateway(profileId: string): { pid: number } {
  const child = spawnHermes(
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

export function reconcileGateways(log: (msg: string) => void = console.log): void {
  const agents = listActiveAgents();

  for (const agent of agents) {
    try {
      const gateway = startGateway(agent.id);
      updateGatewayStatus(agent.id, gateway.pid, "active");
      log(`reconcile: restarted gateway for agent ${agent.id} (pid ${gateway.pid})`);
    } catch (error) {
      updateGatewayStatus(agent.id, null, "stopped");
      log(`reconcile: failed to restart gateway for agent ${agent.id}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

export function isGatewayRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
