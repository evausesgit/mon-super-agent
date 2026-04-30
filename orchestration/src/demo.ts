import { InMemoryNotionAdapter } from "./notion-adapter.js";
import { SymphonyRunner } from "./symphony-runner.js";

const tracker = new InMemoryNotionAdapter([
  {
    pageId: "352061f6ca27815dadb6eafb93c0fe22",
    properties: {
      taskId: "MSA-007",
      title: "Write PRODUCT.md",
      status: "Todo",
      priority: "P0",
      type: "Task",
      sprint: "MVP",
      repoArea: ["docs"],
      blockedBy: [],
      acceptanceCriteria: "PRODUCT.md exists in the repo and matches the chosen MVP direction.",
      agentOutput: "",
    },
  },
  {
    pageId: "352061f6ca27811b9303cc587f797277",
    properties: {
      taskId: "MSA-008",
      title: "Write ARCHITECTURE.md",
      status: "Todo",
      priority: "P0",
      type: "Task",
      sprint: "MVP",
      repoArea: ["docs"],
      blockedBy: ["MSA-007"],
      acceptanceCriteria: "ARCHITECTURE.md exists with components, flows, dependencies, and open questions.",
      agentOutput: "",
    },
  },
]);

const runner = new SymphonyRunner(
  tracker,
  "mon-super-agent-orchestrator",
  async (task) => {
    if (task.taskId === "MSA-007") {
      return {
        outcome: "in_review",
        summary:
          "PRODUCT.md was produced and is ready for review. The MVP scope and Telegram-first recommendation were documented.",
        link: "https://app.notion.com/p/352061f6ca27815dadb6eafb93c0fe22",
      };
    }

    return {
      outcome: "blocked",
      summary: `${task.taskId} is waiting on its upstream dependency.`,
    };
  },
);

const result = await runner.runNextReadyTask();

if (result.kind === "idle") {
  console.log(result.message);
} else {
  console.log(
    JSON.stringify(
      {
        runId: result.runId,
        taskId: result.task.taskId,
        status: result.task.status,
        agentOutput: result.task.agentOutput,
      },
      null,
      2,
    ),
  );
}

