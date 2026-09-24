import z from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import { toolLogs } from "../database/schema";
import { tools } from "../agent";

const CATEGORIES: Record<string, string> = {
  web_search: "web",
  fetch_page: "web",
  browser: "web",
  http_request: "network",
  list_credentials: "network",
  download_file: "network",
  shell: "system",
  shell_background: "system",
  install_package: "system",
  system_info: "system",
  read_file: "files",
  write_file: "files",
  edit_file: "files",
  list_dir: "files",
  search_files: "files",
  delete_path: "files",
  move_path: "files",
  run_code: "code",
  schedule_task: "schedule",
  list_scheduled_tasks: "schedule",
  cancel_scheduled_task: "schedule",
  remember: "memory",
  recall: "memory",
};

export const activity = {
  list: base
    .input(
      z.object({
        limit: z.number().optional(),
        category: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const query = db.select().from(toolLogs).orderBy(desc(toolLogs.id)).limit(input.limit ?? 100);
      if (input.category && input.category !== "all") {
        return query.where(eq(toolLogs.category, input.category));
      }
      return query;
    }),

  stats: base.handler(async () => {
    const [totals] = await db
      .select({
        total: sql<number>`count(*)`,
        errors: sql<number>`sum(case when ${toolLogs.status} = 'error' then 1 else 0 end)`,
        avgMs: sql<number>`coalesce(avg(${toolLogs.durationMs}), 0)`,
      })
      .from(toolLogs);
    const byTool = await db
      .select({ tool: toolLogs.tool, count: sql<number>`count(*)` })
      .from(toolLogs)
      .groupBy(toolLogs.tool)
      .orderBy(desc(sql`count(*)`))
      .limit(8);
    return {
      total: totals?.total ?? 0,
      errors: totals?.errors ?? 0,
      avgMs: Math.round(totals?.avgMs ?? 0),
      byTool,
    };
  }),

  clear: base.handler(async () => {
    await db.delete(toolLogs);
    return { ok: true };
  }),

  capabilities: base.handler(() =>
    Object.entries(tools).map(([name, definition]) => ({
      name,
      category: CATEGORIES[name] ?? "system",
      description: (definition as { description?: string }).description ?? "",
    })),
  ),
};
