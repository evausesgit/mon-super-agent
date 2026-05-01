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
    const genericExecution = await tryGenericExecution(config.repoRoot, task);

    if (genericExecution) {
      const reviewArtifactPath = await writeReviewArtifact({
        repoRoot: config.repoRoot,
        runId,
        task,
        changedFiles: genericExecution.changedFiles,
      });

      return {
        outcome: "in_review",
        summary: [
          `Executed ${task.taskId} through the generic Notion-driven executor.`,
          genericExecution.changedFiles.length > 0
            ? `Changed files: ${genericExecution.changedFiles.join(", ")}.`
            : "The generic executor was idempotent and did not introduce a new diff.",
          `Review artifact: ${path.relative(config.repoRoot, reviewArtifactPath)}.`,
        ].join(" "),
        changedFiles: genericExecution.changedFiles,
        link:
          config.reviewBaseUrl ??
          `https://www.notion.so/${task.pageId.replace(/-/g, "")}`,
      };
    }

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
  "MSA-003": async ({ repoRoot }) => {
    await ensureFile(
      path.join(repoRoot, "docs", "onboarding-flow.md"),
      [
        "# Onboarding Flow",
        "",
        "## Goal",
        "",
        "Describe the MVP onboarding path screen by screen so the team can implement it consistently across product, API, and messaging setup.",
        "",
        "## Screen 1: Landing",
        "",
        "- Promise: create your super agent in minutes.",
        "- Primary action: `Create my super agent`.",
        "- Secondary context: Telegram ships first, WhatsApp follows after the first stable provisioning flow.",
        "",
        "## Screen 2: Agent Setup",
        "",
        "Required fields:",
        "- `Agent name`",
        "- `Preferred channel`",
        "- `User contact`",
        "",
        "Validation rules:",
        "- agent name is required",
        "- contact is required",
        "- Telegram expects a handle or deep-link-friendly identifier",
        "- WhatsApp expects a phone-number-shaped contact",
        "",
        "## Screen 3: Provisioning",
        "",
        "- Show a pending state while the backend creates the agent record.",
        "- Surface a deterministic next step based on the selected channel.",
        "",
        "## Screen 4: Success",
        "",
        "- Show the resulting agent id",
        "- Show the selected channel",
        "- Offer a direct link toward activation",
        "- Offer a link to the agent detail page",
        "",
        "## Failure State",
        "",
        "- Explain whether the problem comes from validation or backend availability.",
        "- Keep the entered values intact so the user can retry quickly.",
      ].join("\n"),
    );

    await ensureFile(
      path.join(repoRoot, "apps", "web", "app", "ui", "onboarding-outline.tsx"),
      [
        "const onboardingScreens = [",
        "  {",
        "    title: \"Landing\",",
        "    description: \"Set the promise, reassure the user, and guide them to a single call to action.\",",
        "    detail: \"Primary CTA: Create my super agent.\",",
        "  },",
        "  {",
        "    title: \"Agent setup\",",
        "    description: \"Collect the agent name, preferred channel, and contact with lightweight validation.\",",
        "    detail: \"Required fields: agent name, preferred channel, user contact.\",",
        "  },",
        "  {",
        "    title: \"Provisioning\",",
        "    description: \"Keep the user informed while the backend provisions the agent and prepares channel activation.\",",
        "    detail: \"Show a pending state and a deterministic next step.\",",
        "  },",
        "  {",
        "    title: \"Success\",",
        "    description: \"Confirm the agent exists, show activation details, and route the user to the chat or detail page.\",",
        "    detail: \"Success state must surface the channel and activation target.\",",
        "  },",
        "];",
        "",
        "export function OnboardingOutline() {",
        "  return (",
        "    <article className=\"panel onboarding-outline\">",
        "      <p className=\"section-label\">Screen by screen</p>",
        "      <div className=\"outline-list\">",
        "        {onboardingScreens.map((screen, index) => (",
        "          <div className=\"outline-card\" key={screen.title}>",
        "            <span className=\"outline-index\">0{index + 1}</span>",
        "            <div>",
        "              <h3>{screen.title}</h3>",
        "              <p>{screen.description}</p>",
        "              <small>{screen.detail}</small>",
        "            </div>",
        "          </div>",
        "        ))}",
        "      </div>",
        "    </article>",
        "  );",
        "}",
      ].join("\n"),
    );

    await ensureImport(
      path.join(repoRoot, "apps", "web", "app", "page.tsx"),
      'import { OnboardingOutline } from "./ui/onboarding-outline";',
    );

    await ensureBlockInFile(
      path.join(repoRoot, "apps", "web", "app", "page.tsx"),
      "        <AgentCreationForm />\n      </section>",
      "        <div className=\"form-stack\">\n          <AgentCreationForm />\n          <OnboardingOutline />\n        </div>\n      </section>",
    );

    await ensureCssBlock(
      path.join(repoRoot, "apps", "web", "app", "globals.css"),
      ".form-stack {",
      [
        ".form-stack {",
        "  display: grid;",
        "  gap: 1rem;",
        "}",
        "",
        ".onboarding-outline {",
        "  padding: 1.4rem;",
        "}",
        "",
        ".outline-list {",
        "  display: grid;",
        "  gap: 0.85rem;",
        "}",
        "",
        ".outline-card {",
        "  display: grid;",
        "  grid-template-columns: auto 1fr;",
        "  gap: 0.9rem;",
        "  align-items: start;",
        "  padding: 1rem;",
        "  border-radius: 20px;",
        "  background: var(--surface-strong);",
        "  border: 1px solid rgba(78, 53, 32, 0.08);",
        "}",
        "",
        ".outline-index {",
        "  display: inline-flex;",
        "  align-items: center;",
        "  justify-content: center;",
        "  width: 2rem;",
        "  height: 2rem;",
        "  border-radius: 999px;",
        "  background: rgba(15, 122, 107, 0.12);",
        "  color: var(--accent-strong);",
        "  font-family: \"Trebuchet MS\", sans-serif;",
        "  font-size: 0.8rem;",
        "  font-weight: 700;",
        "}",
        "",
        ".outline-card h3 {",
        "  margin: 0 0 0.3rem;",
        "  font-size: 1.1rem;",
        "}",
        "",
        ".outline-card p,",
        ".outline-card small {",
        "  color: var(--muted);",
        "  line-height: 1.6;",
        "}",
      ].join("\n"),
    );
  },
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

    await ensureSection(
      path.join(repoRoot, "ARCHITECTURE.md"),
      "## Autonomous Orchestration Boundary",
      [
        "The autonomous orchestrator is responsible for taking shaped tasks from Notion and turning them into verifiable repository changes.",
        "",
        "Its boundary in the current system is:",
        "- select a ready task from Notion",
        "- run a task-specific handler against the repository",
        "- verify the resulting state with repository checks",
        "- publish the resulting change through git and write the commit link back to Notion",
        "",
        "It is not yet responsible for generating large product features without a dedicated task handler.",
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
      path.join(repoRoot, "WORKFLOW.md"),
      "## Autonomous Validation Loop",
      [
        "For supported task types, the orchestrator can validate and ship work without waiting for a manual checkpoint.",
        "",
        "The autonomous loop is:",
        "1. execute the task handler",
        "2. run `npm run lint` and `npm run build`",
        "3. create a run artifact under `orchestration/runs/`",
        "4. commit and push the resulting diff",
        "5. mark the Notion task `Done` and attach the commit link",
        "",
        "This loop should be reserved for low-risk, well-scoped tasks with deterministic acceptance criteria.",
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

    await ensureSection(
      path.join(repoRoot, "docs/SYMPHONY-NOTION.md"),
      "## Autonomous Completion",
      [
        "When autonomous mode is enabled for supported tasks, the orchestrator is allowed to move past `In Review` and finish the full delivery loop.",
        "",
        "That means it can:",
        "- verify the repository state automatically",
        "- create and push a commit",
        "- write the commit URL back into Notion",
        "- mark the task `Done` once the checks pass",
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

async function tryGenericExecution(repoRoot: string, task: OrchestrationTask) {
  if (!task.executionMode || task.executionMode === "manual" || task.executionMode === "manual_handler") {
    return null;
  }

  if (task.filesToTouch.length === 0 || !task.implementationBrief) {
    throw new Error(
      `${task.taskId} is configured for generic execution but is missing Files To Touch or Implementation Brief in Notion.`,
    );
  }

  const changedFilesBefore = await listChangedFiles(repoRoot);

  if (task.executionMode === "generic_markdown") {
    for (const relativeFile of task.filesToTouch) {
      const absoluteFile = path.join(repoRoot, relativeFile);
      await ensureFile(
        absoluteFile,
        [
          `# ${task.title}`,
          "",
          task.implementationBrief,
        ].join("\n"),
      );

      const sectionHeading = `## ${task.taskId} Execution`;
      await ensureSection(absoluteFile, sectionHeading, task.implementationBrief);
    }
  }

  if (task.executionMode === "generic_spec") {
    const mainFile = task.filesToTouch[0];

    if (mainFile) {
      await ensureFile(
        path.join(repoRoot, mainFile),
        [
          `# ${task.title}`,
          "",
          "## Scope",
          "",
          task.implementationBrief,
          "",
          "## Acceptance Criteria",
          "",
          task.acceptanceCriteria || "Not specified in Notion.",
        ].join("\n"),
      );
    }

    for (const relativeFile of task.filesToTouch.slice(1)) {
      await ensureFile(
        path.join(repoRoot, relativeFile),
        [
          "export type Placeholder = {",
          `  taskId: "${task.taskId}";`,
          "};",
          "",
          `export const implementationBrief = ${JSON.stringify(task.implementationBrief)};`,
          "",
        ].join("\n"),
      );
    }
  }

  const changedFilesAfter = await listChangedFiles(repoRoot);
  return {
    changedFiles: changedFilesAfter.filter((file) => !changedFilesBefore.includes(file)),
  };
}

async function ensureFile(filePath: string, content: string) {
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, `${content}\n`, "utf8");
  }
}

async function ensureImport(filePath: string, statement: string) {
  const current = await readFile(filePath, "utf8");

  if (current.includes(statement)) {
    return;
  }

  const next = `${statement}\n${current}`;
  await writeFile(filePath, next, "utf8");
}

async function ensureBlockInFile(filePath: string, target: string, replacement: string) {
  const current = await readFile(filePath, "utf8");

  if (current.includes(replacement)) {
    return;
  }

  if (!current.includes(target)) {
    throw new Error(`Could not find target block in ${filePath}.`);
  }

  await writeFile(filePath, current.replace(target, replacement), "utf8");
}

async function ensureCssBlock(filePath: string, marker: string, block: string) {
  const current = await readFile(filePath, "utf8");

  if (current.includes(marker)) {
    return;
  }

  const next = `${current.trimEnd()}\n\n${block}\n`;
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
