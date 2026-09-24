import type { Tool } from "ai";
import { db } from "../database";
import { toolLogs } from "../database/schema";
import { getRunContext } from "./context";

export type ToolCategory =
  | "web"
  | "system"
  | "files"
  | "code"
  | "network"
  | "schedule"
  | "memory";

function truncate(value: unknown, max = 8000) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}\n…[tronqué]` : text;
}

/**
 * Wraps a tool definition so every invocation lands in the audit trail:
 * name, category, input, output, status, duration.
 */
export function logged<T extends Tool>(
  name: string,
  category: ToolCategory,
  definition: T,
): T {
  const execute = definition.execute as
    | ((input: unknown, options: unknown) => Promise<unknown>)
    | undefined;
  if (!execute) return definition;

  const wrapped = {
    ...definition,
    execute: async (input: unknown, options: unknown) => {
      const started = Date.now();
      const { conversationId, taskId } = getRunContext();
      try {
        const output = await execute(input, options);
        void db
          .insert(toolLogs)
          .values({
            conversationId,
            taskId,
            tool: name,
            category,
            input: truncate(input, 4000),
            output: truncate(output),
            status: "ok",
            durationMs: Date.now() - started,
          })
          .catch(() => undefined);
        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void db
          .insert(toolLogs)
          .values({
            conversationId,
            taskId,
            tool: name,
            category,
            input: truncate(input, 4000),
            output: message,
            status: "error",
            durationMs: Date.now() - started,
          })
          .catch(() => undefined);
        return { error: message };
      }
    },
  };

  return wrapped as unknown as T;
}
