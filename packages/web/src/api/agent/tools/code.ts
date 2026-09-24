import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import z from "zod";
import { tool } from "ai";
import { logged } from "../logging";
import { runCommand } from "./shell";
import { WORKSPACE } from "../context";

const RUNTIMES = {
  python: { file: "main.py", command: "python3 main.py" },
  node: { file: "main.mjs", command: "node main.mjs" },
  bun: { file: "main.ts", command: "bun main.ts" },
  bash: { file: "main.sh", command: "bash main.sh" },
} as const;

export const runCode = logged(
  "run_code",
  "code",
  tool({
    description:
      "Écrit puis exécute un script (python, node, bun/TypeScript, bash) et retourne sa sortie. Idéal pour calculs, scraping, traitement de données, appels d'API complexes. Les paquets manquants peuvent être installés avec install_package.",
    inputSchema: z.object({
      language: z.enum(["python", "node", "bun", "bash"]),
      code: z.string(),
      timeoutSeconds: z.number().optional(),
      workdir: z
        .string()
        .optional()
        .describe("Exécuter dans le workspace au lieu d'un dossier temporaire"),
    }),
    async execute({ language, code, timeoutSeconds, workdir }) {
      const runtime = RUNTIMES[language];
      const dir = workdir ? join(WORKSPACE, workdir) : await mkdtemp(join(tmpdir(), "argus-"));
      await runCommand(`mkdir -p ${JSON.stringify(dir)}`, { timeoutMs: 10_000 });
      const scriptPath = join(dir, runtime.file);
      await writeFile(scriptPath, code, "utf8");
      const result = await runCommand(runtime.command, {
        cwd: dir,
        timeoutMs: Math.min((timeoutSeconds ?? 120) * 1000, 900_000),
      });
      return { ...result, scriptPath };
    },
  }),
);
