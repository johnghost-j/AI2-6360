import { useState } from "react";
import { ChevronRight, CircleAlert, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { CATEGORY_COLOR } from "./layout";

const TOOL_CATEGORY: Record<string, string> = {
  web_search: "web",
  fetch_page: "web",
  browser: "web",
  http_request: "network",
  list_credentials: "network",
  download_file: "network",
  shell: "system",
  shell_background: "system",
  install_package: "system",
  system_info: "system",
  read_file: "files",
  write_file: "files",
  edit_file: "files",
  list_dir: "files",
  search_files: "files",
  delete_path: "files",
  move_path: "files",
  run_code: "code",
  schedule_task: "schedule",
  list_scheduled_tasks: "schedule",
  cancel_scheduled_task: "schedule",
  remember: "memory",
  recall: "memory",
};

function summarize(tool: string, input: unknown): string {
  const data = (input ?? {}) as Record<string, string>;
  switch (tool) {
    case "shell":
    case "shell_background":
      return data.command ?? "";
    case "web_search":
      return data.query ?? "";
    case "fetch_page":
    case "download_file":
      return data.url ?? "";
    case "browser":
      return [data.action, data.url ?? data.selector ?? ""].filter(Boolean).join(" · ");
    case "http_request":
      return `${data.method ?? "GET"} ${data.url ?? ""}`;
    case "run_code":
      return `${data.language ?? ""} · ${(data.code ?? "").split("\n")[0] ?? ""}`;
    case "install_package":
      return `${data.manager ?? ""} ${(data.packages as unknown as string[] | undefined)?.join(" ") ?? ""}`;
    default:
      return Object.values(data)[0] ? String(Object.values(data)[0]).slice(0, 90) : "";
  }
}

function stringify(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function ToolPart({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}) {
  const [open, setOpen] = useState(false);
  const running = state === "input-streaming" || state === "input-available";
  const failed = state === "output-error" || !!errorText;
  const category = TOOL_CATEGORY[name] ?? "system";

  return (
    <div className="panel overflow-hidden bg-surface/70">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-2/60"
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-muted transition-transform", open && "rotate-90")}
        />
        <span className={cn("font-mono text-[12px] font-medium", CATEGORY_COLOR[category])}>
          {name}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
          {summarize(name, input)}
        </span>
        {running && <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" />}
        {failed && <CircleAlert className="size-3.5 shrink-0 text-danger" />}
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          <div>
            <div className="mb-1 font-mono text-[10px] tracking-wider text-muted uppercase">
              entrée
            </div>
            <pre className="max-h-52 overflow-auto rounded-md bg-bg/70 p-2 font-mono text-[11px] whitespace-pre-wrap text-foreground/80">
              {stringify(input) || "—"}
            </pre>
          </div>
          <div>
            <div className="mb-1 font-mono text-[10px] tracking-wider text-muted uppercase">
              sortie
            </div>
            <pre
              className={cn(
                "max-h-72 overflow-auto rounded-md bg-bg/70 p-2 font-mono text-[11px] whitespace-pre-wrap",
                failed ? "text-danger" : "text-foreground/80",
              )}
            >
              {errorText || stringify(output) || (running ? "en cours…" : "—")}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
