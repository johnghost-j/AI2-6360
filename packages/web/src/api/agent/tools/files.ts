import { readFile, writeFile, mkdir, rm, readdir, stat, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import z from "zod";
import { tool } from "ai";
import { logged } from "../logging";
import { resolvePath, WORKSPACE, ensureWorkspace } from "../context";
import { runCommand } from "./shell";

export const readFileTool = logged(
  "read_file",
  "files",
  tool({
    description:
      "Lit un fichier texte (chemin relatif au workspace ou absolu). Supporte un offset/limit en lignes pour les gros fichiers.",
    inputSchema: z.object({
      path: z.string(),
      offset: z.number().optional().describe("Première ligne (1-indexée)"),
      limit: z.number().optional().describe("Nombre de lignes, défaut 800"),
    }),
    async execute({ path, offset, limit }) {
      const full = resolvePath(path);
      const content = await readFile(full, "utf8");
      const lines = content.split("\n");
      const start = Math.max((offset ?? 1) - 1, 0);
      const slice = lines.slice(start, start + (limit ?? 800));
      return {
        path: full,
        totalLines: lines.length,
        from: start + 1,
        content: slice.join("\n").slice(0, 60_000),
      };
    },
  }),
);

export const writeFileTool = logged(
  "write_file",
  "files",
  tool({
    description:
      "Écrit (ou remplace) un fichier. Crée les dossiers parents automatiquement. Pour de petites modifications, préfère edit_file.",
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
      append: z.boolean().optional(),
    }),
    async execute({ path, content, append }) {
      const full = resolvePath(path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, { encoding: "utf8", flag: append ? "a" : "w" });
      return { path: full, bytes: Buffer.byteLength(content), appended: !!append };
    },
  }),
);

export const editFileTool = logged(
  "edit_file",
  "files",
  tool({
    description:
      "Remplace une chaîne exacte dans un fichier. La chaîne doit exister; utilise replaceAll pour toutes les occurrences.",
    inputSchema: z.object({
      path: z.string(),
      oldString: z.string(),
      newString: z.string(),
      replaceAll: z.boolean().optional(),
    }),
    async execute({ path, oldString, newString, replaceAll }) {
      const full = resolvePath(path);
      const content = await readFile(full, "utf8");
      if (!content.includes(oldString)) throw new Error("Chaîne introuvable dans le fichier");
      const occurrences = content.split(oldString).length - 1;
      if (occurrences > 1 && !replaceAll)
        throw new Error(`${occurrences} occurrences — précise replaceAll ou plus de contexte`);
      const updated = replaceAll
        ? content.split(oldString).join(newString)
        : content.replace(oldString, newString);
      await writeFile(full, updated, "utf8");
      return { path: full, replacements: replaceAll ? occurrences : 1 };
    },
  }),
);

export const listDirTool = logged(
  "list_dir",
  "files",
  tool({
    description: "Liste le contenu d'un dossier avec taille et type.",
    inputSchema: z.object({ path: z.string().optional() }),
    async execute({ path }) {
      ensureWorkspace();
      const full = path ? resolvePath(path) : WORKSPACE;
      const entries = await readdir(full, { withFileTypes: true });
      const detailed = await Promise.all(
        entries.slice(0, 500).map(async (entry) => {
          const info = await stat(join(full, entry.name)).catch(() => null);
          return {
            name: entry.name,
            type: entry.isDirectory() ? "dir" : "file",
            sizeBytes: info?.size ?? 0,
            modified: info?.mtime.toISOString() ?? null,
          };
        }),
      );
      return { path: full, entries: detailed };
    },
  }),
);

export const searchFilesTool = logged(
  "search_files",
  "files",
  tool({
    description:
      "Recherche du texte (regex) dans les fichiers, ou des fichiers par nom. Utilise ripgrep si disponible.",
    inputSchema: z.object({
      pattern: z.string(),
      path: z.string().optional(),
      mode: z.enum(["content", "filename"]).optional(),
    }),
    async execute({ pattern, path, mode }) {
      const target = path ? resolvePath(path) : WORKSPACE;
      const command =
        (mode ?? "content") === "filename"
          ? `(rg --files "${target}" 2>/dev/null || find "${target}" -type f) | grep -i -- ${JSON.stringify(pattern)} | head -100`
          : `(rg -n --max-count 5 -- ${JSON.stringify(pattern)} "${target}" 2>/dev/null || grep -rn -- ${JSON.stringify(pattern)} "${target}") | head -100`;
      const result = await runCommand(command, { timeoutMs: 60_000 });
      return { matches: result.stdout || "(aucun résultat)", stderr: result.stderr };
    },
  }),
);

export const deletePathTool = logged(
  "delete_path",
  "files",
  tool({
    description: "Supprime un fichier ou un dossier (récursif). Irréversible.",
    inputSchema: z.object({ path: z.string() }),
    async execute({ path }) {
      const full = resolvePath(path);
      await rm(full, { recursive: true, force: true });
      return { deleted: full };
    },
  }),
);

export const movePathTool = logged(
  "move_path",
  "files",
  tool({
    description: "Déplace ou renomme un fichier/dossier.",
    inputSchema: z.object({ from: z.string(), to: z.string() }),
    async execute({ from, to }) {
      const source = resolvePath(from);
      const target = resolvePath(to);
      await mkdir(dirname(target), { recursive: true });
      await rename(source, target);
      return { from: source, to: target };
    },
  }),
);

export const downloadFileTool = logged(
  "download_file",
  "network",
  tool({
    description:
      "Télécharge un fichier depuis une URL vers le workspace (binaire supporté: zip, pdf, images, installeurs…).",
    inputSchema: z.object({ url: z.string(), path: z.string() }),
    async execute({ url, path }) {
      const full = resolvePath(path);
      await mkdir(dirname(full), { recursive: true });
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(full, buffer);
      return {
        path: full,
        bytes: buffer.byteLength,
        contentType: response.headers.get("content-type"),
      };
    },
  }),
);
