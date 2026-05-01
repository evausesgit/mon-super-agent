import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getRemoteOrigin(repoRoot: string) {
  const { stdout } = await execFileAsync("git", [
    "-C",
    repoRoot,
    "remote",
    "get-url",
    "origin",
  ]);

  return stdout.trim();
}

export async function listChangedFiles(repoRoot: string) {
  const { stdout } = await execFileAsync("git", ["-C", repoRoot, "status", "--short"]);

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z? ]{1,2}\s+/, ""));
}

export async function runRepoChecks(repoRoot: string, commands?: string[]) {
  const checks = commands && commands.length > 0 ? commands : ["npm run lint", "npm run build"];
  await execFileAsync("zsh", [
    "-lic",
    `cd ${shellEscape(repoRoot)} && ${checks.join(" && ")}`,
  ]);
}

export async function commitAndPush(input: {
  repoRoot: string;
  taskId: string;
  runId: string;
  files: string[];
  commitMessage?: string;
}) {
  if (input.files.length === 0) {
    throw new Error(`No files were changed for ${input.taskId}; refusing to auto-commit.`);
  }

  await execFileAsync("git", ["-C", input.repoRoot, "add", ...input.files]);
  await execFileAsync("git", [
    "-C",
    input.repoRoot,
    "commit",
    "-m",
    input.commitMessage ?? `Autonomous ${input.taskId} validation (${input.runId})`,
  ]);
  await execFileAsync("git", ["-C", input.repoRoot, "push", "origin", "main"]);

  const { stdout } = await execFileAsync("git", [
    "-C",
    input.repoRoot,
    "rev-parse",
    "HEAD",
  ]);

  return stdout.trim();
}

export function toCommitUrl(remoteUrl: string, commitSha: string) {
  const normalized = remoteUrl
    .replace(/^git@github.com:/, "https://github.com/")
    .replace(/\.git$/, "");

  return `${normalized}/commit/${commitSha}`;
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
