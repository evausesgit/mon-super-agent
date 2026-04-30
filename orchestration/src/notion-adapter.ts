import {
  type OrchestrationTask,
  type PickTaskOptions,
  type TaskTransition,
} from "./task-types.js";

export interface TaskTrackerAdapter {
  listTasks(options?: PickTaskOptions): Promise<OrchestrationTask[]>;
  getTask(taskId: string): Promise<OrchestrationTask | null>;
  updateTask(taskId: string, transition: TaskTransition): Promise<OrchestrationTask>;
}

type NotionPageProperty =
  | { type: "title"; title: Array<{ plain_text?: string }> }
  | { type: "rich_text"; rich_text: Array<{ plain_text?: string }> }
  | { type: "select"; select: { name: string } | null }
  | { type: "multi_select"; multi_select: Array<{ name: string }> }
  | { type: "relation"; relation: Array<{ id: string }> }
  | { type: "url"; url: string | null }
  | {
      type: "date";
      date: { start: string; end: string | null; time_zone: string | null } | null;
    };

type NotionPage = {
  id: string;
  properties: Record<string, NotionPageProperty>;
};

type NotionQueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

type NotionRow = {
  pageId: string;
  properties: {
    taskId: string;
    title: string;
    status: OrchestrationTask["status"];
    priority: OrchestrationTask["priority"];
    type: OrchestrationTask["type"];
    sprint: OrchestrationTask["sprint"];
    repoArea: OrchestrationTask["repoArea"];
    blockedBy: string[];
    acceptanceCriteria: string;
    agentOutput: string;
    runId?: string;
    lastUpdatedByAgent?: string;
    link?: string;
  };
};

export class InMemoryNotionAdapter implements TaskTrackerAdapter {
  private readonly tasks = new Map<string, OrchestrationTask>();

  constructor(seedRows: NotionRow[]) {
    for (const row of seedRows) {
      const task = mapNotionRowToTask(row);
      this.tasks.set(task.taskId, task);
    }
  }

  async listTasks(options?: PickTaskOptions): Promise<OrchestrationTask[]> {
    return [...this.tasks.values()]
      .filter((task) => {
        if (options?.sprint && task.sprint !== options.sprint) {
          return false;
        }

        if (options?.onlyReady) {
          return task.status === "Todo" && task.blockedBy.length === 0;
        }

        return true;
      })
      .sort(compareTasks);
  }

  async getTask(taskId: string): Promise<OrchestrationTask | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async updateTask(taskId: string, transition: TaskTransition): Promise<OrchestrationTask> {
    const current = this.tasks.get(taskId);

    if (!current) {
      throw new Error(`Task ${taskId} was not found in the Notion adapter.`);
    }

    const updated: OrchestrationTask = {
      ...current,
      status: transition.status,
      agentOutput: transition.agentOutput,
      runId: transition.runId,
      lastUpdatedByAgent: transition.agentName,
      link: transition.link ?? current.link,
    };

    this.tasks.set(taskId, updated);
    return updated;
  }
}

export class NotionApiTaskTrackerAdapter implements TaskTrackerAdapter {
  constructor(
    private readonly config: {
      token: string;
      dataSourceId: string;
      apiVersion: string;
    },
  ) {}

  async listTasks(options?: PickTaskOptions): Promise<OrchestrationTask[]> {
    const tasks: OrchestrationTask[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<NotionQueryResponse>(
        `/v1/data_sources/${this.config.dataSourceId}/query`,
        {
          method: "POST",
          body: JSON.stringify({
            page_size: 100,
            start_cursor: cursor,
          }),
        },
      );

      for (const page of response.results) {
        const task = mapNotionPageToTask(page);

        if (options?.sprint && task.sprint !== options.sprint) {
          continue;
        }

        if (options?.onlyReady) {
          if (task.status !== "Todo" || task.blockedBy.length > 0) {
            continue;
          }
        }

        tasks.push(task);
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return tasks.sort(compareTasks);
  }

  async getTask(taskId: string): Promise<OrchestrationTask | null> {
    const tasks = await this.listTasks();
    return tasks.find((task) => task.taskId === taskId) ?? null;
  }

  async updateTask(taskId: string, transition: TaskTransition): Promise<OrchestrationTask> {
    const current = await this.getTask(taskId);

    if (!current) {
      throw new Error(`Task ${taskId} was not found in Notion.`);
    }

    const page = await this.request<NotionPage>(`/v1/pages/${current.pageId}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: {
          Status: {
            select: {
              name: transition.status,
            },
          },
          "Run ID": {
            rich_text: richText(transition.runId),
          },
          "Last Updated By Agent": {
            rich_text: richText(transition.agentName),
          },
          "Last Sync At": {
            date: {
              start: transition.syncedAt,
            },
          },
          "Agent Output": {
            rich_text: richText(transition.agentOutput),
          },
          ...(transition.link
            ? {
                Link: {
                  url: transition.link,
                },
              }
            : {}),
        },
      }),
    });

    return mapNotionPageToTask(page);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`https://api.notion.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
        "Notion-Version": this.config.apiVersion,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Notion API request failed (${response.status}): ${body}`);
    }

    return (await response.json()) as T;
  }
}

export function mapNotionRowToTask(row: NotionRow): OrchestrationTask {
  return {
    pageId: row.pageId,
    taskId: row.properties.taskId,
    title: row.properties.title,
    status: row.properties.status,
    priority: row.properties.priority,
    type: row.properties.type,
    sprint: row.properties.sprint,
    repoArea: row.properties.repoArea,
    blockedBy: row.properties.blockedBy,
    acceptanceCriteria: row.properties.acceptanceCriteria,
    agentOutput: row.properties.agentOutput,
    runId: row.properties.runId,
    lastUpdatedByAgent: row.properties.lastUpdatedByAgent,
    link: row.properties.link,
  };
}

export function mapNotionPageToTask(page: NotionPage): OrchestrationTask {
  const properties = page.properties;

  return {
    pageId: page.id,
    taskId: readRichText(properties["ID"] ?? properties["userDefined:ID"]),
    title: readTitle(properties.Title),
    status: readSelect(properties.Status) as OrchestrationTask["status"],
    priority: readSelect(properties.Priority) as OrchestrationTask["priority"],
    type: readSelect(properties.Type) as OrchestrationTask["type"],
    sprint: readSelect(properties.Sprint) as OrchestrationTask["sprint"],
    repoArea: readMultiSelect(properties["Repo Area"]) as OrchestrationTask["repoArea"],
    blockedBy: readRelation(properties["Blocked By"]),
    acceptanceCriteria: readRichText(properties["Acceptance Criteria"]),
    agentOutput: readRichText(properties["Agent Output"]),
    runId: readRichText(properties["Run ID"]) || undefined,
    lastUpdatedByAgent:
      readRichText(properties["Last Updated By Agent"]) || undefined,
    link: readUrl(properties.Link) || undefined,
  };
}

function compareTasks(left: OrchestrationTask, right: OrchestrationTask) {
  const priorityOrder = ["P0", "P1", "P2", "P3"];
  const leftIndex = priorityOrder.indexOf(left.priority);
  const rightIndex = priorityOrder.indexOf(right.priority);

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return left.taskId.localeCompare(right.taskId);
}

function readTitle(property: NotionPageProperty | undefined) {
  if (!property || property.type !== "title") {
    return "";
  }

  return property.title.map((item) => item.plain_text ?? "").join("");
}

function readRichText(property: NotionPageProperty | undefined) {
  if (!property || property.type !== "rich_text") {
    return "";
  }

  return property.rich_text.map((item) => item.plain_text ?? "").join("");
}

function readSelect(property: NotionPageProperty | undefined) {
  if (!property || property.type !== "select" || !property.select) {
    return "";
  }

  return property.select.name;
}

function readMultiSelect(property: NotionPageProperty | undefined) {
  if (!property || property.type !== "multi_select") {
    return [];
  }

  return property.multi_select.map((item) => item.name);
}

function readRelation(property: NotionPageProperty | undefined) {
  if (!property || property.type !== "relation") {
    return [];
  }

  return property.relation.map((item) => item.id);
}

function readUrl(property: NotionPageProperty | undefined) {
  if (!property || property.type !== "url") {
    return "";
  }

  return property.url ?? "";
}

function richText(content: string) {
  return [
    {
      type: "text",
      text: {
        content,
      },
    },
  ];
}
