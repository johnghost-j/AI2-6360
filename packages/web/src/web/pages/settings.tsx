import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Layout, PageHeader, CATEGORY_COLOR } from "../components/layout";
import { cn } from "../lib/utils";
import {
  useCredentials,
  useDeleteCredential,
  useDeleteMemory,
  useMemories,
  useSaveCredential,
  useSystem,
} from "../queries/workspace";
import { useCapabilities } from "../queries/activity";
import { EngineSettings } from "../components/engine-settings";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-4">
      <h2 className="font-display text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-1 font-mono text-[11px] text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Settings() {
  const credentials = useCredentials();
  const saveCredential = useSaveCredential();
  const deleteCredential = useDeleteCredential();
  const memories = useMemories();
  const deleteMemory = useDeleteMemory();
  const capabilities = useCapabilities();
  const system = useSystem();
  const [form, setForm] = useState({ name: "", value: "", note: "" });

  return (
    <Layout>
      <div className="flex h-full flex-col">
        <PageHeader title="Réglages" subtitle="moteur, clés d'API, mémoire, machine, capacités" />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-8 py-6 pb-12">
          <EngineSettings />

          <Section
            title="Credentials d'APIs externes"
            hint="l'agent les utilise via {{secret.NOM}} dans http_request — les valeurs ne quittent jamais le serveur"
          >
            <div className="grid gap-2 md:grid-cols-[200px_1fr_180px_auto]">
              <input
                aria-label="Nom du credential"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value.toUpperCase().replace(/\s/g, "_") })
                }
                placeholder="RESEND_API_KEY"
                className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
              />
              <input
                aria-label="Valeur du credential"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
                type="password"
                placeholder="valeur secrète"
                className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
              />
              <input
                aria-label="Note du credential"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                placeholder="note (optionnel)"
                className="rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-[12px] outline-none focus:border-accent/40"
              />
              <button
                type="button"
                disabled={!form.name || !form.value}
                onClick={() =>
                  saveCredential.mutate(form, {
                    onSuccess: () => setForm({ name: "", value: "", note: "" }),
                  })
                }
                className="flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-2 font-mono text-[12px] text-bg disabled:opacity-30"
              >
                <Plus className="size-3.5" /> ajouter
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {credentials.data?.length === 0 && (
                <p className="font-mono text-[11.5px] text-muted">aucune clé enregistrée</p>
              )}
              {credentials.data?.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center gap-3 rounded-[8px] border border-border bg-surface-2/50 px-3 py-2"
                >
                  <KeyRound className="size-3.5 text-accent" />
                  <span className="font-mono text-[12px]">{credential.name}</span>
                  <span className="font-mono text-[11px] text-muted">{credential.preview}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
                    {credential.note}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCredential.mutate({ id: credential.id })}
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Mémoire longue durée" hint="ce que l'agent a retenu entre les sessions">
            <div className="space-y-1.5">
              {memories.data?.length === 0 && (
                <p className="font-mono text-[11.5px] text-muted">mémoire vide</p>
              )}
              {memories.data?.map((memory) => (
                <div
                  key={memory.id}
                  className="flex items-start gap-3 rounded-[8px] border border-border bg-surface-2/50 px-3 py-2"
                >
                  <span className="font-mono text-[12px] text-violet">{memory.key}</span>
                  <span className="min-w-0 flex-1 text-[12.5px] text-foreground/80">
                    {memory.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMemory.mutate({ id: memory.id })}
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Machine de l'agent">
            <dl className="grid gap-2 font-mono text-[12px] sm:grid-cols-2">
              {[
                ["plateforme", system.data?.platform],
                ["workspace", system.data?.workspace],
                ["vCPU", system.data?.cpus],
                ["RAM", `${system.data?.freeMemoryGb} / ${system.data?.totalMemoryGb} Go`],
                ["uptime", `${system.data?.uptimeHours} h`],
                ["node", system.data?.node],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex gap-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="min-w-0 truncate">{String(value ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section
            title={`Capacités armées (${capabilities.data?.length ?? 0})`}
            hint="outils disponibles à chaque tour, sans confirmation"
          >
            <div className="grid gap-2 md:grid-cols-2">
              {capabilities.data?.map((capability) => (
                <div key={capability.name} className="rounded-[8px] border border-border p-2.5">
                  <div
                    className={cn(
                      "font-mono text-[12px] font-medium",
                      CATEGORY_COLOR[capability.category],
                    )}
                  >
                    {capability.name}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

export default Settings;
