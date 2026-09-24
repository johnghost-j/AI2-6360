import { useState } from "react";
import { ArrowUp, File, Folder, RefreshCw } from "lucide-react";
import { Layout, PageHeader } from "../components/layout";
import { cn } from "../lib/utils";
import { useFileContent, useSystem, useTree } from "../queries/workspace";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function Workspace() {
  const [path, setPath] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const tree = useTree(path);
  const file = useFileContent(selected);
  const system = useSystem();

  return (
    <Layout>
      <div className="flex h-full flex-col">
        <PageHeader
          title="Workspace"
          subtitle={`${tree.data?.root ?? ""}${path ? `/${path}` : ""}`}
        >
          <span className="font-mono text-[11px] text-muted">
            {system.data?.platform} · {system.data?.cpus} vCPU ·{" "}
            {system.data?.freeMemoryGb}/{system.data?.totalMemoryGb} Go libres
          </span>
          <button
            type="button"
            onClick={() => tree.refetch()}
            className="rounded-[8px] border border-border p-2 text-muted hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", tree.isFetching && "animate-spin")} />
          </button>
        </PageHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[360px_1fr]">
          <div className="min-h-0 overflow-y-auto border-r border-border bg-surface/40 p-3">
            <div className="mb-2 px-2.5 font-mono text-[10px] tracking-widest text-muted/70 uppercase">
              fichiers
            </div>
            {path && (
              <button
                type="button"
                onClick={() => setPath(path.split("/").slice(0, -1).join("/"))}
                className="mb-1 flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 font-mono text-[12px] text-muted hover:bg-surface-2"
              >
                <ArrowUp className="size-3.5" /> ..
              </button>
            )}
            {tree.data?.entries.length === 0 && (
              <p className="px-2 py-6 font-mono text-[11.5px] text-muted">
                workspace vide — l'agent le remplira
              </p>
            )}
            {tree.data?.entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => (entry.isDir ? setPath(entry.path) : setSelected(entry.path))}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-surface-2",
                  selected === entry.path && "bg-surface-2",
                )}
              >
                {entry.isDir ? (
                  <Folder className="size-3.5 shrink-0 text-accent" />
                ) : (
                  <File className="size-3.5 shrink-0 text-muted" />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{entry.name}</span>
                {!entry.isDir && (
                  <span className="font-mono text-[10px] text-muted">
                    {formatSize(entry.sizeBytes)}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="min-h-0 overflow-auto p-5">
            {!selected && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <File className="size-8 text-muted/40" strokeWidth={1.5} />
                <p className="font-mono text-[12px] text-muted">
                  sélectionne un fichier pour l'inspecter
                </p>
              </div>
            )}
            {selected && (
              <>
                <div className="mb-3 font-mono text-[11px] break-all text-accent">{selected}</div>
                {file.data?.tooLarge ? (
                  <p className="font-mono text-[12px] text-muted">
                    fichier trop volumineux pour l'aperçu
                  </p>
                ) : (
                  <pre className="rounded-[10px] border border-border bg-bg/70 p-3 font-mono text-[11.5px] whitespace-pre-wrap text-foreground/85">
                    {file.isLoading ? "chargement…" : file.data?.content}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Workspace;
