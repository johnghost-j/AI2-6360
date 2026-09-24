import { useState } from "react";
import { Play, Plus, Power, Trash2 } from "lucide-react";
import { Layout, PageHeader } from "../components/layout";
import { cn } from "../lib/utils";
import {
  useCreateTask,
  useRemoveTask,
  useRunTask,
  useTasks,
  useToggleTask,
} from "../queries/tasks";

const FREQUENCIES = [
  { value: "once", label: "une fois" },
  { value: "minutes", label: "toutes les X min" },
  { value: "hourly", label: "chaque heure" },
  { value: "daily", label: "chaque jour" },
  { value: "weekly", label: "chaque semaine" },
] as const;

function Tasks() {
  const tasks = useTasks();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const removeTask = useRemoveTask();
  const runTask = useRunTask();

  const [form, setForm] = useState({
    name: "",
    instructions: "",
    frequency: "daily" as (typeof FREQUENCIES)[number]["value"],
    intervalMinutes: 30,
  });
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <Layout>
      <div className="flex h-full flex-col">
        <PageHeader
          title="Tâches autonomes"
          subtitle="l'agent s'exécute seul, sans personne devant l'écran · vérification toutes les 30s"
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="panel p-4">
            <h2 className="font-display text-sm font-semibold">Nouvelle tâche</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_200px]">
              <input
                aria-label="Nom de la tâche"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Nom — ex. Veille concurrence"
                className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent/40"
              />
              <div className="flex gap-2">
                <select
                  value={form.frequency}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      frequency: event.target.value as typeof form.frequency,
                    })
                  }
                  className="flex-1 rounded-[8px] border border-border bg-surface-2 px-2 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
                >
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency.value} value={frequency.value}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
                {form.frequency === "minutes" && (
                  <input
                    aria-label="Intervalle en minutes"
                    type="number"
                    min={1}
                    value={form.intervalMinutes}
                    onChange={(event) =>
                      setForm({ ...form, intervalMinutes: Number(event.target.value) })
                    }
                    className="w-16 rounded-[8px] border border-border bg-surface-2 px-2 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
                  />
                )}
              </div>
            </div>
            <textarea
              aria-label="Instructions de la tâche"
              value={form.instructions}
              onChange={(event) => setForm({ ...form, instructions: event.target.value })}
              rows={3}
              placeholder="Instructions complètes et autonomes — ex. Vérifie les prix sur ces 3 sites, compare avec prices.json et écris un rapport dans reports/"
              className="mt-3 w-full resize-none rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent/40"
            />
            <button
              type="button"
              disabled={!form.name.trim() || !form.instructions.trim() || createTask.isPending}
              onClick={() =>
                createTask.mutate(
                  { ...form },
                  {
                    onSuccess: () =>
                      setForm({
                        name: "",
                        instructions: "",
                        frequency: "daily",
                        intervalMinutes: 30,
                      }),
                  },
                )
              }
              className="mt-3 flex items-center gap-1.5 rounded-[8px] bg-accent px-3.5 py-2 font-mono text-[12px] text-bg disabled:opacity-30"
            >
              <Plus className="size-3.5" /> programmer
            </button>
          </div>

          <div className="mt-6 space-y-2 pb-10">
            {tasks.data?.length === 0 && (
              <p className="panel px-4 py-8 text-center font-mono text-[12px] text-muted">
                aucune tâche programmée
              </p>
            )}
            {tasks.data?.map((task) => (
              <div key={task.id} className="panel overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      task.enabled ? "bg-accent dot-live" : "bg-muted/40",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === task.id ? null : task.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-[14px] font-medium">{task.name}</div>
                    <div className="font-mono text-[10.5px] text-muted">
                      {task.frequency === "minutes"
                        ? `toutes les ${task.intervalMinutes} min`
                        : task.frequency}
                      {" · prochaine "}
                      {new Date(task.nextRunAt).toLocaleString("fr-BE")}
                      {" · "}
                      {task.runCount} run(s)
                      {task.lastStatus && ` · dernier: ${task.lastStatus}`}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => runTask.mutate({ id: task.id })}
                    disabled={runTask.isPending}
                    className="flex items-center gap-1 rounded-[8px] border border-accent/30 bg-accent/10 px-2.5 py-1.5 font-mono text-[11px] text-accent disabled:opacity-40"
                  >
                    <Play className="size-3" /> exécuter
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTask.mutate({ id: task.id, enabled: !task.enabled })}
                    className="rounded-[8px] border border-border p-1.5 text-muted hover:text-foreground"
                  >
                    <Power className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTask.mutate({ id: task.id })}
                    className="rounded-[8px] border border-border p-1.5 text-muted hover:border-danger/40 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {openId === task.id && (
                  <div className="space-y-3 border-t border-border px-4 py-3">
                    <div>
                      <div className="font-mono text-[10px] tracking-widest text-muted uppercase">
                        instructions
                      </div>
                      <p className="mt-1 text-[13px] whitespace-pre-wrap text-foreground/80">
                        {task.instructions}
                      </p>
                    </div>
                    {task.lastResult && (
                      <div>
                        <div className="font-mono text-[10px] tracking-widest text-muted uppercase">
                          dernier compte rendu
                        </div>
                        <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-bg/70 p-2 font-mono text-[11px] whitespace-pre-wrap text-foreground/75">
                          {task.lastResult}
                        </pre>
                      </div>
                    )}
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

export default Tasks;
