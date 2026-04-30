import { NotionApiTaskTrackerAdapter } from "./notion-adapter.js";
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

const runner = new SymphonyRunner(
  tracker,
  "mon-super-agent-orchestrator",
  async (task) => {
    const summary = [
      `Picked ${task.taskId} from Notion and executed it through the live runner.`,
      `Repo area: ${task.repoArea.join(", ") || "unspecified"}.`,
      `Acceptance criteria snapshot: ${task.acceptanceCriteria || "missing"}.`,
    ].join(" ");

    if (!task.acceptanceCriteria) {
      return {
        outcome: "blocked" as const,
        summary: `${summary} The task was blocked because it is missing acceptance criteria.`,
      };
    }

    return {
      outcome: "in_review" as const,
      summary: `${summary} The task has been moved to In Review for human validation.`,
      link: `https://www.notion.so/${task.pageId.replace(/-/g, "")}`,
    };
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
    },
    null,
    2,
  ),
);
