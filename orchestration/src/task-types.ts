export const orchestrationStatuses = [
  "Inbox",
  "Todo",
  "In Progress",
  "Blocked",
  "In Review",
  "Done",
] as const;

export type OrchestrationStatus = (typeof orchestrationStatuses)[number];

export type TaskType =
  | "Epic"
  | "Feature"
  | "Task"
  | "Bug"
  | "Research"
  | "Ops";

export type RepoArea =
  | "apps/web"
  | "apps/api"
  | "services/agent-runtime"
  | "orchestration"
  | "docs";

export type Priority = "P0" | "P1" | "P2" | "P3";

export type OrchestrationTask = {
  pageId: string;
  taskId: string;
  title: string;
  status: OrchestrationStatus;
  priority: Priority;
  type: TaskType;
  sprint: "MVP" | "Post-MVP" | "Later";
  repoArea: RepoArea[];
  blockedBy: string[];
  acceptanceCriteria: string;
  agentOutput: string;
  runId?: string;
  lastUpdatedByAgent?: string;
  link?: string;
};

export type TaskTransition = {
  status: OrchestrationStatus;
  agentOutput: string;
  runId: string;
  agentName: string;
  link?: string;
  syncedAt: string;
};

export type PickTaskOptions = {
  sprint?: OrchestrationTask["sprint"];
  onlyReady?: boolean;
};

