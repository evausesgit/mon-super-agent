import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listChangedFiles as listGitChangedFiles } from "./git-ops.js";
import type { TaskExecutionResult } from "./symphony-runner.js";
import type { OrchestrationTask } from "./task-types.js";

export function createRepoTaskExecutor(config: {
  repoRoot: string;
  reviewBaseUrl?: string;
}) {
  return async function executeTask(
    task: OrchestrationTask,
    runId: string,
  ): Promise<TaskExecutionResult> {
    const handler = handlers[task.taskId];

    if (!handler) {
      return {
        outcome: "skipped",
        summary: `No repo-aware handler exists yet for ${task.taskId}. The task was left in Todo so a supported task can be executed next.`,
      };
    }

    const changedFilesBefore = await listChangedFiles(config.repoRoot);
    await handler({
      repoRoot: config.repoRoot,
      task,
      runId,
    });
    const changedFilesAfter = await listChangedFiles(config.repoRoot);
    const newChangedFiles = changedFilesAfter.filter(
      (file) => !changedFilesBefore.includes(file),
    );
    const reviewArtifactPath = await writeReviewArtifact({
      repoRoot: config.repoRoot,
      runId,
      task,
      changedFiles: newChangedFiles,
    });

    const summary = [
      `Executed ${task.taskId} and produced a reviewable repo change.`,
      newChangedFiles.length > 0
        ? `Changed files: ${newChangedFiles.join(", ")}.`
        : "The handler was idempotent and did not introduce a new diff.",
      `Review artifact: ${path.relative(config.repoRoot, reviewArtifactPath)}.`,
    ].join(" ");

    return {
      outcome: "in_review",
      summary,
      changedFiles: newChangedFiles,
      link:
        config.reviewBaseUrl ??
        `https://www.notion.so/${task.pageId.replace(/-/g, "")}`,
    };
  };
}

type HandlerContext = {
  repoRoot: string;
  task: OrchestrationTask;
  runId: string;
};

const handlers: Record<string, (context: HandlerContext) => Promise<void>> = {
  "MSA-007": async ({ repoRoot }) => {
    await ensureSection(
      path.join(repoRoot, "PRODUCT.md"),
      "## Delivery Review Loop",
      [
        "Every orchestrated task should leave behind a concrete review surface in the repository.",
        "",
        "For MVP delivery, the expected review artifacts are:",
        "- a changed file or set of changed files",
        "- a short execution summary in Notion",
        "- a run artifact under `orchestration/runs/` when the work was executed by the orchestrator",
      ].join("\n"),
    );
  },
  "MSA-008": async ({ repoRoot }) => {
    await ensureSection(
      path.join(repoRoot, "ARCHITECTURE.md"),
      "## Reviewable Delivery Artifacts",
      [
        "The orchestration layer should not move a task to `In Review` without leaving behind something concrete to inspect.",
        "",
        "The minimal review package for an automated run is:",
        "- the repo diff",
        "- the list of changed files",
        "- the Notion status transition and run metadata",
        "- a short review artifact in `orchestration/runs/`",
      ].join("\n"),
    );
  },
  "MSA-009": async ({ repoRoot }) => {
    await ensureSection(
      path.join(repoRoot, "WORKFLOW.md"),
      "## Reviewable Code Path",
      [
        "When an orchestrator executes a task, the expected path is:",
        "1. move the task from `Todo` to `In Progress`",
        "2. produce a repo change through a task-specific handler",
        "3. write a run artifact in `orchestration/runs/`",
        "4. move the task to `In Review` with the changed files called out in `Agent Output`",
        "",
        "A task should stay in `Todo` if the runner has no implementation handler for it yet.",
      ].join("\n"),
    );

    await ensureSection(
      path.join(repoRoot, "docs/SYMPHONY-NOTION.md"),
      "## Review Loop",
      [
        "A live orchestration run is not complete until a human can inspect a concrete artifact.",
        "",
        "The current implementation creates a markdown review artifact under `orchestration/runs/` and summarizes the changed files back into Notion.",
      ].join("\n"),
    );
  },
};

async function ensureSection(filePath: string, heading: string, body: string) {
  const current = await readFile(filePath, "utf8");

  if (current.includes(heading)) {
    return;
  }

  const next = `${current.trimEnd()}\n\n${heading}\n\n${body}\n`;
  await writeFile(filePath, next, "utf8");
}

async function writeReviewArtifact(input: {
  repoRoot: string;
  runId: string;
  task: OrchestrationTask;
  changedFiles: string[];
}) {
  const runsDir = path.join(input.repoRoot, "orchestration", "runs");
  await mkdir(runsDir, { recursive: true });

  const filePath = path.join(runsDir, `${input.runId}.md`);
  const reviewContent = [
    `# ${input.runId}`,
    "",
    `- Task: ${input.task.taskId} - ${input.task.title}`,
    `- Status target: In Review`,
    `- Repo areas: ${input.task.repoArea.join(", ") || "unspecified"}`,
    "",
    "## Changed Files",
    "",
    ...(input.changedFiles.length > 0
      ? input.changedFiles.map((file) => `- ${file}`)
      : ["- No new changed files were created by this run."]),
    "",
    "## Review Checklist",
    "",
    "- Confirm the changed files actually satisfy the task acceptance criteria.",
    "- Confirm the Notion status transition makes sense.",
    "- Capture any follow-up work as a new task instead of overloading the current one.",
  ].join("\n");

  await writeFile(filePath, reviewContent, "utf8");
  return filePath;
}

async function listChangedFiles(repoRoot: string) {
  return listGitChangedFiles(repoRoot);
}
