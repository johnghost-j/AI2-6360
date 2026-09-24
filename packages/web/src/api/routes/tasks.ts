import z from "zod";
import { desc, eq } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import { scheduledTasks } from "../database/schema";
import { runTask } from "../agent/scheduler";
import { computeNextRun } from "../agent/tools/schedule";

export const tasks = {
  list: base.handler(() =>
    db.select().from(scheduledTasks).orderBy(desc(scheduledTasks.id)),
  ),

  create: base
    .input(
      z.object({
        name: z.string().min(1),
        instructions: z.string().min(1),
        frequency: z.enum(["once", "minutes", "hourly", "daily", "weekly"]),
        intervalMinutes: z.number().optional(),
        startAt: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [row] = await db
        .insert(scheduledTasks)
        .values({
          name: input.name,
          instructions: input.instructions,
          frequency: input.frequency,
          intervalMinutes: input.intervalMinutes ?? 60,
          nextRunAt: input.startAt ? new Date(input.startAt) : new Date(),
        })
        .returning();
      return row;
    }),

  toggle: base
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .handler(async ({ input }) => {
      const [task] = await db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.id, input.id))
        .limit(1);
      await db
        .update(scheduledTasks)
        .set({
          enabled: input.enabled,
          nextRunAt:
            input.enabled && task
              ? computeNextRun(task.frequency, task.intervalMinutes, new Date())
              : (task?.nextRunAt ?? new Date()),
        })
        .where(eq(scheduledTasks.id, input.id));
      return { ok: true };
    }),

  remove: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(scheduledTasks).where(eq(scheduledTasks.id, input.id));
    return { ok: true };
  }),

  runNow: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const result = await runTask(input.id);
    return result;
  }),
};
