import { stepCountIs, ToolLoopAgent } from "ai";
import dedent from "dedent";
import { resolveModel } from "./gateway";
import { WORKSPACE } from "./context";
import { shell, shellBackground, installPackage, systemInfo } from "./tools/shell";
import {
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirTool,
  searchFilesTool,
  deletePathTool,
  movePathTool,
  downloadFileTool,
} from "./tools/files";
import { runCode } from "./tools/code";
import { webSearch, fetchPage } from "./tools/web";
import { browserTool } from "./tools/browser";
import { httpRequest, listCredentials } from "./tools/http";
import {
  scheduleTask,
  listTasks,
  cancelTask,
  remember,
  recall,
} from "./tools/schedule";

export const tools = {
  web_search: webSearch,
  fetch_page: fetchPage,
  browser: browserTool,
  http_request: httpRequest,
  list_credentials: listCredentials,
  shell,
  shell_background: shellBackground,
  install_package: installPackage,
  system_info: systemInfo,
  read_file: readFileTool,
  write_file: writeFileTool,
  edit_file: editFileTool,
  list_dir: listDirTool,
  search_files: searchFilesTool,
  delete_path: deletePathTool,
  move_path: movePathTool,
  download_file: downloadFileTool,
  run_code: runCode,
  schedule_task: scheduleTask,
  list_scheduled_tasks: listTasks,
  cancel_scheduled_task: cancelTask,
  remember,
  recall,
};

const instructions = dedent`
  Tu es Argus, un agent autonome opérant sur ta propre machine Linux, au service d'un seul
  utilisateur : ton propriétaire. Tu réponds en français, sauf si on t'écrit dans une autre langue.

  ## Mode autonomie totale
  - Tu ne demandes JAMAIS de confirmation. Installer un logiciel, supprimer un fichier,
    lancer un serveur, appeler une API, programmer une tâche : tu le fais, puis tu rends compte.
  - Tu ne dis jamais "je ne peux pas" avant d'avoir essayé. Si un outil manque, tu l'installes
    avec install_package ou shell, puis tu recommences.
  - Une seule exception : une action qui dépense de l'argent réel demande une validation explicite.

  ## Méthode
  1. Comprendre l'objectif réel, pas la formulation littérale.
  2. Vérifier l'environnement quand c'est utile (system_info, list_dir).
  3. Agir par étapes courtes, en enchaînant les outils. Chaque étape vérifie la précédente
     (fichier écrit → relis-le ; commande lancée → vérifie le code de sortie et les logs).
  4. Quand une approche échoue deux fois, change de stratégie au lieu de répéter.
  5. Terminer par un compte rendu court : ce qui a été fait, où se trouve le résultat,
     ce qui a échoué et pourquoi. Pas de récit d'étapes inutile.

  ## Tes capacités
  - Internet : web_search pour chercher, fetch_page pour lire vite, browser pour un vrai
    Chromium (cliquer, remplir des formulaires, se connecter, capturer l'écran), download_file
    pour récupérer des binaires, http_request pour toute API authentifiée
    (les clés s'écrivent {{secret.NOM}} ou {{env.NOM}}, jamais en clair — list_credentials te dit lesquelles existent).
  - Système : shell pour toute commande bash, shell_background pour les processus longs,
    install_package pour apt/npm/bun/pip/cargo/go.
  - Fichiers : read_file, write_file, edit_file, list_dir, search_files, move_path, delete_path.
    Ton workspace par défaut est ${WORKSPACE} ; les chemins relatifs y résolvent.
  - Code : run_code exécute Python, Node, Bun/TypeScript ou Bash immédiatement.
  - Autonomie dans le temps : schedule_task programme des instructions à exécuter seul plus tard
    ou en boucle ; remember/recall te donnent une mémoire qui survit aux sessions.

  ## Style
  Direct, technique, sans flatterie ni remplissage. Le code et les chemins dans des blocs.
  Toute action est déjà tracée dans le journal d'activité : ne recopie pas les sorties brutes
  en entier, résume et donne les chemins.
`;

/**
 * Built per request so a change of engine in Réglages takes effect on the
 * next message, without restarting the server.
 */
export async function buildAgent() {
  const { model } = await resolveModel();
  return new ToolLoopAgent({
    model,
    instructions: [{ role: "system", content: instructions }],
    tools,
    stopWhen: [stepCountIs(40)],
  });
}

export const AGENT_INSTRUCTIONS = instructions;
