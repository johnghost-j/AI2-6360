import { useState } from "react";
import { CircleAlert, Radio, Trash2 } from "lucide-react";
import { Layout, PageHeader, CATEGORY_COLOR } from "../components/layout";
import { cn } from "../lib/utils";
import { useActivity, useActivityStats, useClearActivity } from "../queries/activity";

const FILTERS = ["all", "web", "network", "system", "code", "files", "schedule", "memory"];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel px-4 py-3">
      <div className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</div>
      <div className="mt-1 font-mono text-xl font-medium">{value}</div>
    </div>
  );
}

function Activity() {
  const [category, setCategory] = useState("all");
  const [live, setLive] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const logs = useActivity(category, live);
  const stats = useActivityStats();
  const clear = useClearActivity();

  return (
    <Layout>
      <div className="flex h-full flex-col">
        <PageHeader title="Activité" subtitle="chaque appel d'outil de l'agent, tracé">
          <button
            type="button"
            onClick={() => setLive(!live)}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] border px-3 py-2 font-mono text-[11px]",
              live
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            <Radio className={cn("size-3.5", live && "dot-live")} /> live
          </button>
          <button
            type="button"
            onClick={() => clear.mutate({})}
            className="flex items-center gap-1.5 rounded-[8px] border border-border px-3 py-2 font-mono text-[11px] text-muted hover:border-danger/40 hover:text-danger"
          >
            <Trash2 className="size-3.5" /> vider
          </button>
        </PageHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="appels" value={stats.data?.total ?? 0} />
            <Stat label="erreurs" value={stats.data?.errors ?? 0} />
            <Stat label="durée moy." value={`${stats.data?.avgMs ?? 0} ms`} />
            <Stat label="top outil" value={stats.data?.byTool?.[0]?.tool ?? "—"} />
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCategory(filter)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                  category === filter
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border text-muted hover:text-foreground",
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 pb-10">
            {logs.data?.length === 0 && (
              <p className="panel px-4 py-8 text-center font-mono text-[12px] text-muted">
                aucun appel d'outil pour l'instant
              </p>
            )}
            {logs.data?.map((log) => (
              <div key={log.id} className="panel overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === log.id ? null : log.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2/60"
                >
                  <span className="font-mono text-[10.5px] text-muted">
                    {new Date(log.createdAt).toLocaleTimeString("fr-BE")}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[12px] font-medium",
                      CATEGORY_COLOR[log.category] ?? "text-foreground",
                    )}
                  >
                    {log.tool}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
                    {log.input}
                  </span>
                  {log.taskId && (
                    <span className="rounded-full border border-violet/40 px-2 py-0.5 font-mono text-[10px] text-violet">
                      tâche #{log.taskId}
                    </span>
                  )}
                  <span className="font-mono text-[10.5px] text-muted">{log.durationMs}ms</span>
                  {log.status === "error" ? (
                    <CircleAlert className="size-3.5 text-danger" />
                  ) : (
                    <span className="size-2 rounded-full bg-accent/60" />
                  )}
                </button>
                {openId === log.id && (
                  <div className="space-y-2 border-t border-border px-4 py-3">
                    <pre className="max-h-40 overflow-auto rounded-md bg-bg/70 p-2 font-mono text-[11px] whitespace-pre-wrap text-foreground/75">
                      {log.input}
                    </pre>
                    <pre
                      className={cn(
                        "max-h-72 overflow-auto rounded-md bg-bg/70 p-2 font-mono text-[11px] whitespace-pre-wrap",
                        log.status === "error" ? "text-danger" : "text-foreground/75",
                      )}
                    >
                      {log.output}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Activity;
