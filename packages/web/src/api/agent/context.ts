import { mkdirSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

/**
 * Where the agent works. Everything relative resolves in here; absolute paths
 * are allowed on purpose (full autonomy mode) but logged like everything else.
 */
const proc = process as unknown as {
  env: Record<string, string | undefined>;
  cwd(): string;
  version: string;
};

export const WORKSPACE =
  proc.env.AGENT_WORKSPACE ?? resolve(proc.cwd(), "../../.agent-workspace");

export function ensureWorkspace() {
  mkdirSync(WORKSPACE, { recursive: true });
  return WORKSPACE;
}

export function resolvePath(path: string) {
  ensureWorkspace();
  return isAbsolute(path) ? path : resolve(WORKSPACE, path);
}

/** Set per agent run so tool logs can be attributed to a conversation or a scheduled task. */
type RunContext = { conversationId?: string; taskId?: number };
let current: RunContext = {};

export function setRunContext(ctx: RunContext) {
  current = ctx;
}

export function getRunContext() {
  return current;
}
