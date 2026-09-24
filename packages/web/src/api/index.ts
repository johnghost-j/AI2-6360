import type { RouterClient } from "@orpc/server";
import { createAgentUIStreamResponse } from "ai";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { chat } from "./routes/chat";
import { activity } from "./routes/activity";
import { tasks } from "./routes/tasks";
import { workspace } from "./routes/workspace";
import { settings } from "./routes/settings";
import { buildAgent } from "./agent";
import { setRunContext } from "./agent/context";
import { startScheduler } from "./agent/scheduler";

export const router = {
  ping,
  chat,
  activity,
  tasks,
  workspace,
  settings,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

/** Streaming agent endpoint (not oRPC: it returns a UI message stream). */
app.post("/api/agent/messages", async (c) => {
  const { messages, conversationId } = await c.req.json();
  setRunContext({ conversationId });
  const agent = await buildAgent();
  return createAgentUIStreamResponse({ agent, uiMessages: messages });
});

// Autonomous scheduled-task runner.
startScheduler();

export default app;
