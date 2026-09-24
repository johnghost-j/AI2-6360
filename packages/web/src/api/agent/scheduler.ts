import { and, eq, lte } from "drizzle-orm";
import { generateText, stepCountIs } from "ai";
import { db } from "../database";
import { scheduledTasks } from "../database/schema";
import { resolveModel } from "./gateway";
import { tools, AGENT_INSTRUCTIONS } from "./index";
import { setRunContext } from "./context";
import { computeNextRun } from "./tools/schedule";

const TICK_MS = 30_000;

/** Runs one scheduled task headlessly, with the same tools as the chat agent. */
export async function runTask(taskId: number) {
  const [task] = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.id, taskId))
    .limit(1);
  if (!task) return { error: "Tâche introuvable" };

  setRunContext({ taskId: task.id });
  const startedAt = new Date();
  try {
    const { model } = await resolveModel();
    const { text } = await generateText({
      model,
      system: `${AGENT_INSTRUCTIONS}\n\n## Exécution planifiée\nTu tournes sans utilisateur devant l'écran. Personne ne peut répondre à une question : prends les décisions toi-même et termine la tâche. Rends un compte rendu final court.`,
      prompt: `Tâche planifiée "${task.name}":\n\n${task.instructions}`,
      tools,
      stopWhen: [stepCountIs(30)],
    });

    const isRecurring = task.frequency !== "once";
    await db
      .update(scheduledTasks)
      .set({
        lastRunAt: startedAt,
        lastStatus: "ok",
        lastResult: text.slice(0, 8000),
        runCount: task.runCount + 1,
        enabled: isRecurring,
        nextRunAt: isRecurring
          ? computeNextRun(task.frequency, task.intervalMinutes)
          : task.nextRunAt,
      })
      .where(eq(scheduledTasks.id, task.id));
    return { ok: true, result: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isRecurring = task.frequency !== "once";
    await db
      .update(scheduledTasks)
      .set({
        lastRunAt: startedAt,
        lastStatus: "error",
        lastResult: message.slice(0, 4000),
        runCount: task.runCount + 1,
        enabled: isRecurring,
        nextRunAt: isRecurring
          ? computeNextRun(task.frequency, task.intervalMinutes)
          : task.nextRunAt,
      })
      .where(eq(scheduledTasks.id, task.id));
    return { ok: false, error: message };
  } finally {
    setRunContext({});
  }
}

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const due = await db
      .select()
      .from(scheduledTasks)
      .where(and(eq(scheduledTasks.enabled, true), lte(scheduledTasks.nextRunAt, new Date())))
      .limit(3);
    for (const task of due) {
      // Push the next run forward first so a slow task never double-fires.
      await db
        .update(scheduledTasks)
        .set({
          nextRunAt: computeNextRun(
            task.frequency === "once" ? "once" : task.frequency,
            task.intervalMinutes,
            new Date(),
          ),
        })
        .where(eq(scheduledTasks.id, task.id));
      await runTask(task.id);
    }
  } catch {
    // scheduler must never crash the server
  } finally {
    running = false;
  }
}

/** Started once from src/api/index.ts — survives hot reloads via a global flag. */
export function startScheduler() {
  const globalRef = globalThis as { __argusScheduler?: ReturnType<typeof setInterval> };
  if (globalRef.__argusScheduler) return;
  globalRef.__argusScheduler = setInterval(tick, TICK_MS);
  void tick();
}
