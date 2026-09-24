import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import os from "node:os";
import z from "zod";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import { credentials, memories } from "../database/schema";
import { ensureWorkspace, resolvePath, WORKSPACE } from "../agent/context";

const TEXT_EXTENSIONS =
  /\.(txt|md|json|jsonl|csv|tsv|log|ts|tsx|js|jsx|mjs|cjs|py|sh|bash|html|css|yml|yaml|toml|env|sql|xml|rs|go|java|rb|php|ini|conf)$/i;

export const workspace = {
  tree: base
    .input(z.object({ path: z.string().optional() }))
    .handler(async ({ input }) => {
      ensureWorkspace();
      const target = input.path ? resolvePath(input.path) : WORKSPACE;
      const entries = await readdir(target, { withFileTypes: true }).catch(() => []);
      const detailed = await Promise.all(
        entries.map(async (entry) => {
          const full = join(target, entry.name);
          const info = await stat(full).catch(() => null);
          return {
            name: entry.name,
            path: relative(WORKSPACE, full) || entry.name,
            isDir: entry.isDirectory(),
            sizeBytes: info?.size ?? 0,
            modified: info?.mtime.toISOString() ?? null,
            isImage: /\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name),
            isText: TEXT_EXTENSIONS.test(entry.name),
          };
        }),
      );
      detailed.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
      return { root: WORKSPACE, path: relative(WORKSPACE, target), entries: detailed };
    }),

  readFile: base.input(z.object({ path: z.string() })).handler(async ({ input }) => {
    const full = resolvePath(input.path);
    const info = await stat(full);
    if (info.size > 2_000_000) return { path: full, tooLarge: true, content: "" };
    const content = await readFile(full, "utf8").catch(() => "(binaire ou illisible)");
    return { path: full, tooLarge: false, content: content.slice(0, 400_000) };
  }),

  system: base.handler(() => ({
    workspace: WORKSPACE,
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpus: os.cpus().length,
    totalMemoryGb: +(os.totalmem() / 1024 ** 3).toFixed(1),
    freeMemoryGb: +(os.freemem() / 1024 ** 3).toFixed(1),
    uptimeHours: +(os.uptime() / 3600).toFixed(1),
    node: (process as unknown as { version: string }).version,
  })),

  listCredentials: base.handler(async () => {
    const rows = await db.select().from(credentials);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      preview: `${row.value.slice(0, 3)}••••${row.value.slice(-2)}`,
      createdAt: row.createdAt,
    }));
  }),

  saveCredential: base
    .input(z.object({ name: z.string().min(1), value: z.string().min(1), note: z.string().optional() }))
    .handler(async ({ input }) => {
      await db
        .insert(credentials)
        .values({ name: input.name, value: input.value, note: input.note })
        .onConflictDoUpdate({
          target: credentials.name,
          set: { value: input.value, note: input.note },
        });
      return { ok: true };
    }),

  deleteCredential: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(credentials).where(eq(credentials.id, input.id));
    return { ok: true };
  }),

  listMemories: base.handler(() => db.select().from(memories)),

  deleteMemory: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(memories).where(eq(memories.id, input.id));
    return { ok: true };
  }),
};
