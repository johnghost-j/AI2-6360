import z from "zod";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { logged } from "../logging";
import { db } from "../../database";
import { scheduledTasks, memories } from "../../database/schema";

export function computeNextRun(
  frequency: string,
  intervalMinutes: number,
  from = new Date(),
) {
  const next = new Date(from);
  switch (frequency) {
    case "minutes":
      next.setMinutes(next.getMinutes() + Math.max(intervalMinutes, 1));
      break;
    case "hourly":
      next.setHours(next.getHours() + 1);
      break;
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    default:
      break;
  }
  return next;
}

export const scheduleTask = logged(
  "schedule_task",
  "schedule",
  tool({
    description:
      "Programme une tâche autonome: des instructions que l'agent exécutera plus tard, une fois ou de façon récurrente (toutes les X minutes, chaque heure, chaque jour, chaque semaine). L'agent s'exécute seul, sans l'utilisateur.",
    inputSchema: z.object({
      name: z.string(),
      instructions: z.string().describe("Prompt complet et autonome à exécuter"),
      frequency: z.enum(["once", "minutes", "hourly", "daily", "weekly"]),
      intervalMinutes: z.number().optional().describe("Requis si frequency = minutes"),
      startAt: z.string().optional().describe("Date ISO du premier lancement, défaut maintenant"),
    }),
    async execute({ name, instructions, frequency, intervalMinutes, startAt }) {
      const first = startAt ? new Date(startAt) : new Date();
      const [row] = await db
        .insert(scheduledTasks)
        .values({
          name,
          instructions,
          frequency,
          intervalMinutes: intervalMinutes ?? 60,
          nextRunAt: first,
        })
        .returning();
      return { taskId: row!.id, nextRunAt: row!.nextRunAt };
    },
  }),
);

export const listTasks = logged(
  "list_scheduled_tasks",
  "schedule",
  tool({
    description: "Liste les tâches programmées avec leur état et leur dernier résultat.",
    inputSchema: z.object({}),
    async execute() {
      return { tasks: await db.select().from(scheduledTasks) };
    },
  }),
);

export const cancelTask = logged(
  "cancel_scheduled_task",
  "schedule",
  tool({
    description: "Désactive ou supprime une tâche programmée.",
    inputSchema: z.object({
      taskId: z.number(),
      remove: z.boolean().optional().describe("true = suppression définitive"),
    }),
    async execute({ taskId, remove }) {
      if (remove) {
        await db.delete(scheduledTasks).where(eq(scheduledTasks.id, taskId));
        return { removed: taskId };
      }
      await db
        .update(scheduledTasks)
        .set({ enabled: false })
        .where(eq(scheduledTasks.id, taskId));
      return { disabled: taskId };
    },
  }),
);

export const remember = logged(
  "remember",
  "memory",
  tool({
    description:
      "Mémoire longue durée: enregistre un fait, une préférence, un identifiant ou un état à réutiliser dans les sessions futures.",
    inputSchema: z.object({ key: z.string(), value: z.string() }),
    async execute({ key, value }) {
      await db
        .insert(memories)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: memories.key,
          set: { value, updatedAt: new Date() },
        });
      return { saved: key };
    },
  }),
);

export const recall = logged(
  "recall",
  "memory",
  tool({
    description: "Relit la mémoire longue durée (tout, ou une clé précise).",
    inputSchema: z.object({ key: z.string().optional() }),
    async execute({ key }) {
      if (key) {
        const [row] = await db.select().from(memories).where(eq(memories.key, key)).limit(1);
        return { memory: row ?? null };
      }
      return { memories: await db.select().from(memories) };
    },
  }),
);
