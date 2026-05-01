import { NotionApiTaskTrackerAdapter } from "./notion-adapter.js";
import { createRepoTaskExecutor } from "./repo-task-executor.js";
import { SymphonyRunner } from "./symphony-runner.js";

const token = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !dataSourceId) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID. Add them to your environment before running the live orchestration.",
  );
  process.exit(1);
}

const tracker = new NotionApiTaskTrackerAdapter({
  token,
  dataSourceId,
  apiVersion,
});

const repoRoot = new URL("../../", import.meta.url).pathname;
const executor = createRepoTaskExecutor({
  repoRoot,
});

const runner = new SymphonyRunner(
  tracker,
  "mon-super-agent-orchestrator",
  async (task, runId) => {
    if (!task.acceptanceCriteria) {
      return {
        outcome: "blocked" as const,
        summary: `Picked ${task.taskId}, but it was blocked because it is missing acceptance criteria.`,
      };
    }

    return executor(task, runId);
  },
);

const result = await runner.runNextReadyTask();

if (result.kind === "idle") {
  console.log(result.message);
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      runId: result.runId,
      taskId: result.task.taskId,
      status: result.task.status,
      lastUpdatedByAgent: result.task.lastUpdatedByAgent,
      link: result.task.link,
      changedFiles:
        result.kind === "ran" && "changedFiles" in result.execution
          ? result.execution.changedFiles
          : undefined,
    },
    null,
    2,
  ),
);
