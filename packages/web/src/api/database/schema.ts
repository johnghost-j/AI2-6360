import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/** A chat session with the agent. */
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Nouvelle session"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Persisted UI messages (JSON blob per message) so sessions survive reloads. */
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    role: text("role").notNull(),
    /** Serialized UIMessage (parts included). */
    payload: text("payload").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId)],
);

/** Every single tool invocation the agent makes — the audit trail. */
export const toolLogs = sqliteTable(
  "tool_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    conversationId: text("conversation_id"),
    taskId: integer("task_id"),
    tool: text("tool").notNull(),
    /** "web" | "system" | "files" | "code" | "network" | "schedule" | "memory" */
    category: text("category").notNull().default("system"),
    input: text("input").notNull().default("{}"),
    output: text("output").notNull().default(""),
    status: text("status").notNull().default("ok"),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("tool_logs_created_idx").on(t.createdAt)],
);

/** Autonomous jobs: the agent (or the user) schedules instructions to run later/repeatedly. */
export const scheduledTasks = sqliteTable("scheduled_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  /** "once" | "minutes" | "hourly" | "daily" | "weekly" */
  frequency: text("frequency").notNull().default("once"),
  /** For "minutes": interval in minutes. */
  intervalMinutes: integer("interval_minutes").notNull().default(60),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  nextRunAt: integer("next_run_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  lastStatus: text("last_status"),
  lastResult: text("last_result"),
  runCount: integer("run_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Long-term memory the agent writes to itself. */
export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Credentials for external APIs, injected into http_request as {{secret.NAME}}. */
export const credentials = sqliteTable("credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  value: text("value").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Single-row-per-key app configuration (AI provider, API keys for the engine, etc.). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
