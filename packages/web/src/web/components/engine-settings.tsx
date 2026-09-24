import { useEffect, useState } from "react";
import { Check, Cpu, Loader2, Trash2, TriangleAlert, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import {
  useAiSettings,
  useClearAbliteration,
  useSaveAbliteration,
  useSetProvider,
  useTestAbliteration,
} from "../queries/settings";

type TestResult =
  | { ok: true; status?: number; latencyMs?: number; model?: string; reply?: string }
  | { ok: false; status?: number; error?: string };

export function EngineSettings() {
  const settings = useAiSettings();
  const save = useSaveAbliteration();
  const setProvider = useSetProvider();
  const clear = useClearAbliteration();
  const test = useTestAbliteration();

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);

  // Hydrate the editable fields once the stored config arrives.
  useEffect(() => {
    if (!settings.data) return;
    setModel((current) => current || settings.data.abliteration.model);
    setBaseURL((current) => current || settings.data.abliteration.baseURL);
  }, [settings.data]);

  const data = settings.data;
  const active = data?.activeProvider === "abliteration";
  const hasKey = data?.abliteration.hasKey ?? false;
  const busy = save.isPending || setProvider.isPending || clear.isPending;

  async function handleSave(activate: boolean) {
    setResult(null);
    await save.mutateAsync({
      apiKey: apiKey.trim() || undefined,
      model,
      baseURL,
      activate,
    });
    setApiKey("");
  }

  async function handleTest() {
    setResult(null);
    const response = await test.mutateAsync({ apiKey: apiKey.trim() || undefined });
    setResult(response as TestResult);
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
            <Cpu className="size-4 text-accent" />
            Moteur de l'agent
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted">
            Abliteration AI — endpoint compatible OpenAI, utilisé pour le chat et les tâches
            planifiées
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase",
            active
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border bg-surface-2 text-muted",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", active ? "dot-live bg-accent" : "bg-muted/60")}
          />
          {active ? "abliteration actif" : `défaut · ${data?.defaultModel ?? "—"}`}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_220px]">
        <label className="block">
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
            clé d'API
          </span>
          <input
            aria-label="clé d'API abliteration"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type="password"
            autoComplete="off"
            placeholder={hasKey ? `enregistrée · ${data?.abliteration.keyPreview}` : "abl_..."}
            className="mt-1 w-full rounded-[8px] border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">modèle</span>
          <input
            aria-label="modèle abliteration"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="abliterated-model"
            className="mt-1 w-full rounded-[8px] border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
          />
        </label>
      </div>

      <label className="mt-2 block">
        <span className="font-mono text-[10px] tracking-widest text-muted uppercase">base url</span>
        <input
          aria-label="base url abliteration"
          value={baseURL}
          onChange={(event) => setBaseURL(event.target.value)}
          placeholder="https://api.abliteration.ai/v1"
          className="mt-1 w-full rounded-[8px] border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-accent/40"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || (!apiKey.trim() && !hasKey)}
          onClick={() => void handleSave(true)}
          className="flex items-center gap-1.5 rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-[11px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          <Zap className="size-3.5" />
          {active ? "enregistrer" : "enregistrer et activer"}
        </button>

        <button
          type="button"
          disabled={test.isPending || (!apiKey.trim() && !hasKey)}
          onClick={() => void handleTest()}
          className="flex items-center gap-1.5 rounded-[8px] border border-border px-3 py-2 font-mono text-[11px] text-muted transition-colors hover:text-foreground disabled:opacity-40"
        >
          {test.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          tester la connexion
        </button>

        {hasKey && active && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setProvider.mutate({ provider: "default" })}
            className="rounded-[8px] border border-border px-3 py-2 font-mono text-[11px] text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            revenir au moteur par défaut
          </button>
        )}

        {hasKey && !active && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setProvider.mutate({ provider: "abliteration" })}
            className="rounded-[8px] border border-border px-3 py-2 font-mono text-[11px] text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            activer
          </button>
        )}

        {hasKey && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setResult(null);
              clear.mutate({});
            }}
            className="ml-auto flex items-center gap-1.5 rounded-[8px] px-2.5 py-2 font-mono text-[11px] text-muted transition-colors hover:text-danger disabled:opacity-40"
          >
            <Trash2 className="size-3.5" /> supprimer la clé
          </button>
        )}
      </div>

      {result && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-[8px] border px-3 py-2.5 font-mono text-[11.5px]",
            result.ok
              ? "border-accent/30 bg-accent/5 text-accent"
              : "border-danger/40 bg-danger/5 text-danger",
          )}
        >
          {result.ok ? (
            <Check className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          )}
          <div className="min-w-0">
            {result.ok ? (
              <>
                <div>
                  connexion OK · {result.model} · {result.latencyMs} ms
                </div>
                {result.reply && (
                  <div className="mt-1 break-words text-foreground/70">
                    réponse : {result.reply}
                  </div>
                )}
              </>
            ) : (
              <div className="break-words">
                échec{result.status ? ` (HTTP ${result.status})` : ""} : {result.error}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-muted/70">
        La clé est stockée côté serveur et n'est jamais renvoyée au navigateur ni exposée au modèle.
        Sans clé, l'agent tourne sur le moteur par défaut.
      </p>
    </section>
  );
}
