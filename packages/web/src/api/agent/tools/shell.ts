import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import z from "zod";
import { tool } from "ai";
import { logged } from "../logging";
import { ensureWorkspace, resolvePath, WORKSPACE } from "../context";

const MAX_OUTPUT = 60_000;

export function runCommand(
  command: string,
  opts: { cwd?: string; timeoutMs?: number; env?: Record<string, string> } = {},
) {
  ensureWorkspace();
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
  }>((resolvePromise) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: opts.cwd ? resolvePath(opts.cwd) : WORKSPACE,
      env: { ...process.env, ...opts.env, DEBIAN_FRONTEND: "noninteractive" },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(
      () => {
        timedOut = true;
        child.kill("SIGKILL");
      },
      opts.timeoutMs ?? 120_000,
    );

    child.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_OUTPUT) stderr += chunk.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({
        exitCode: code,
        stdout: stdout.slice(0, MAX_OUTPUT),
        stderr: stderr.slice(0, MAX_OUTPUT),
        timedOut,
      });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ exitCode: -1, stdout, stderr: String(error), timedOut });
    });
  });
}

export const shell = logged(
  "shell",
  "system",
  tool({
    description:
      "Exécute n'importe quelle commande shell (bash) sur le serveur de l'agent. Accès complet: git, curl, apt, npm, pip, ffmpeg, etc. Retourne stdout, stderr et le code de sortie. Utilise-le librement, sans demander confirmation.",
    inputSchema: z.object({
      command: z.string().describe("La commande bash à exécuter"),
      cwd: z
        .string()
        .optional()
        .describe("Répertoire d'exécution (relatif au workspace ou absolu)"),
      timeoutSeconds: z.number().optional().describe("Timeout, défaut 120s, max 900s"),
    }),
    async execute({ command, cwd, timeoutSeconds }) {
      const result = await runCommand(command, {
        cwd,
        timeoutMs: Math.min((timeoutSeconds ?? 120) * 1000, 900_000),
      });
      return result;
    },
  }),
);

export const shellBackground = logged(
  "shell_background",
  "system",
  tool({
    description:
      "Lance une commande longue durée en arrière-plan (serveur, worker, watcher, téléchargement lourd). Retourne le PID et le chemin du fichier de log à lire ensuite avec read_file.",
    inputSchema: z.object({
      command: z.string(),
      cwd: z.string().optional(),
      label: z.string().optional().describe("Nom court utilisé pour le fichier de log"),
    }),
    async execute({ command, cwd, label }) {
      ensureWorkspace();
      const logPath = join(
        WORKSPACE,
        `.logs-${(label ?? "process").replace(/[^a-z0-9-_]/gi, "_")}-${Date.now()}.log`,
      );
      const fd = openSync(logPath, "a");
      const child = spawn("bash", ["-lc", command], {
        cwd: cwd ? resolvePath(cwd) : WORKSPACE,
        env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" },
        detached: true,
        stdio: ["ignore", fd, fd],
      });
      child.unref();
      return { pid: child.pid, logPath, note: "Processus détaché lancé." };
    },
  }),
);

export const installPackage = logged(
  "install_package",
  "system",
  tool({
    description:
      "Installe un logiciel ou une librairie depuis internet. manager: apt (système), npm/bun (JS), pip (Python), cargo, go, brew. Tente sudo automatiquement pour apt.",
    inputSchema: z.object({
      manager: z.enum(["apt", "npm", "bun", "pip", "cargo", "go", "brew"]),
      packages: z.array(z.string()).min(1),
      global: z.boolean().optional().describe("Installation globale pour npm/bun"),
    }),
    async execute({ manager, packages, global: isGlobal }) {
      const list = packages.join(" ");
      const commands: Record<string, string> = {
        apt: `sudo apt-get update -y && sudo apt-get install -y ${list}`,
        npm: `npm install ${isGlobal ? "-g " : ""}${list}`,
        bun: `bun add ${isGlobal ? "-g " : ""}${list}`,
        pip: `(pip install --break-system-packages ${list} || pip install ${list})`,
        cargo: `cargo install ${list}`,
        go: `go install ${list}`,
        brew: `brew install ${list}`,
      };
      return runCommand(commands[manager]!, { timeoutMs: 600_000 });
    },
  }),
);

export const systemInfo = logged(
  "system_info",
  "system",
  tool({
    description:
      "Décrit la machine de l'agent: OS, CPU, RAM, disque, workspace et outils disponibles (git, python, node, docker, ffmpeg…).",
    inputSchema: z.object({}),
    async execute() {
      const probe = await runCommand(
        "for b in git curl wget python3 pip node bun npm docker ffmpeg rg jq sqlite3 playwright chromium; do command -v $b >/dev/null 2>&1 && echo \"$b: yes\" || echo \"$b: no\"; done; echo '---'; df -h / | tail -1; echo '---'; whoami; echo '---'; sudo -n true 2>/dev/null && echo 'sudo: passwordless' || echo 'sudo: unavailable'",
        { timeoutMs: 30_000 },
      );
      return {
        platform: `${os.type()} ${os.release()} ${os.arch()}`,
        cpus: os.cpus().length,
        totalMemoryGb: +(os.totalmem() / 1024 ** 3).toFixed(1),
        freeMemoryGb: +(os.freemem() / 1024 ** 3).toFixed(1),
        uptimeHours: +(os.uptime() / 3600).toFixed(1),
        workspace: WORKSPACE,
        probe: probe.stdout,
      };
    },
  }),
);
