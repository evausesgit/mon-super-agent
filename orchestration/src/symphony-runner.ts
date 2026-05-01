import crypto from "node:crypto";
import type { TaskTrackerAdapter } from "./notion-adapter.js";
import type { OrchestrationTask } from "./task-types.js";

export type TaskExecutionResult =
  | {
      outcome: "done" | "in_review";
      summary: string;
      link?: string;
      commitSha?: string;
      changedFiles?: string[];
    }
  | {
      outcome: "blocked";
      summary: string;
    }
  | {
      outcome: "skipped";
      summary: string;
    };

export type TaskExecutor = (task: OrchestrationTask, runId: string) => Promise<TaskExecutionResult>;

export class SymphonyRunner {
  constructor(
    private readonly tracker: TaskTrackerAdapter,
    private readonly agentName: string,
    private readonly executor: TaskExecutor,
  ) {}

  async runNextReadyTask() {
    const [nextTask] = await this.tracker.listTasks({
      sprint: "MVP",
      onlyReady: true,
    });

    if (!nextTask) {
      return {
        kind: "idle" as const,
        message: "No ready tasks were found in Notion.",
      };
    }

    const runId = createRunId(nextTask.taskId);
    const syncedAt = new Date().toISOString();

    await this.tracker.updateTask(nextTask.taskId, {
      status: "In Progress",
      runId,
      agentName: this.agentName,
      agentOutput: `Run ${runId} picked up ${nextTask.taskId} and started execution.`,
      syncedAt,
    });

    const result = await this.executor(nextTask, runId);
    const nextStatus =
      result.outcome === "done"
        ? "Done"
        : result.outcome === "in_review"
          ? "In Review"
          : result.outcome === "skipped"
            ? "Todo"
          : "Blocked";

    const updatedTask = await this.tracker.updateTask(nextTask.taskId, {
      status: nextStatus,
      runId,
      agentName: this.agentName,
      agentOutput: result.summary,
      link: "link" in result ? result.link : undefined,
      syncedAt: new Date().toISOString(),
    });

    return {
      kind: "ran" as const,
      runId,
      task: updatedTask,
      execution: result,
    };
  }
}

function createRunId(taskId: string) {
  return `run_${taskId}_${crypto.randomUUID().slice(0, 8)}`;
}
