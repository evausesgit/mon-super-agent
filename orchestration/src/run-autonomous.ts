import { getRemoteOrigin, commitAndPush, listChangedFiles, runRepoChecks, toCommitUrl } from "./git-ops.js";
import { NotionApiTaskTrackerAdapter } from "./notion-adapter.js";
import { createRepoTaskExecutor } from "./repo-task-executor.js";
import { SymphonyRunner } from "./symphony-runner.js";

const token = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
const apiVersion = process.env.NOTION_API_VERSION ?? "2025-09-03";

if (!token || !dataSourceId) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID. Add them to your environment before running the autonomous orchestration.",
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
  "mon-super-agent-autonomous-orchestrator",
  async (task, runId) => {
    try {
      if (!task.acceptanceCriteria) {
        return {
          outcome: "blocked" as const,
          summary: `Picked ${task.taskId}, but it was blocked because it is missing acceptance criteria.`,
        };
      }

      const execution = await executor(task, runId);

      if (execution.outcome !== "in_review" && execution.outcome !== "done") {
        return execution;
      }

      const changedFiles =
        "changedFiles" in execution && execution.changedFiles
          ? execution.changedFiles
          : await listChangedFiles(repoRoot);

      if (changedFiles.length === 0) {
        return {
          outcome: "skipped" as const,
          summary: `No repo diff remained after executing ${task.taskId}; nothing was committed.`,
        };
      }

      await runRepoChecks(repoRoot, task.validationCommands);
      const commitSha = await commitAndPush({
        repoRoot,
        taskId: task.taskId,
        runId,
        files: changedFiles,
        commitMessage: task.commitMessage,
      });
      const commitUrl = toCommitUrl(await getRemoteOrigin(repoRoot), commitSha);

      return {
        outcome: "done" as const,
        summary: [
          `Autonomously executed, verified, committed, and pushed ${task.taskId}.`,
          `Changed files: ${changedFiles.join(", ")}.`,
          `Commit: ${commitSha.slice(0, 7)}.`,
        ].join(" "),
        link: commitUrl,
        commitSha,
        changedFiles,
      };
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        outcome: "blocked" as const,
        summary: `Autonomous execution for ${task.taskId} was blocked by an error: ${message}`,
      };
    }
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
      link: result.task.link,
      execution: result.execution,
    },
    null,
    2,
  ),
);
