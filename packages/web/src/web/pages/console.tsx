import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Plus,
  Square,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react";
import { Layout } from "../components/layout";
import { ToolPart } from "../components/tool-part";
import { cn } from "../lib/utils";
import {
  useConversations,
  useConversationMessages,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
  useSaveMessages,
} from "../queries/console";
import { useCapabilities } from "../queries/activity";

const EXAMPLES = [
  "Cherche les 5 dernières news sur les agents IA et écris-moi un résumé dans news.md",
  "Vérifie ce que cette machine a comme outils installés, puis installe ffmpeg et yt-dlp",
  "Ouvre un navigateur sur news.ycombinator.com, récupère le top 10 et exporte-le en CSV",
  "Toutes les heures, vérifie si example.com répond et note les pannes dans uptime.log",
];

function Markdownish({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[14.5px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline decoration-accent/40 hover:decoration-accent"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
          h1: ({ children }) => (
            <h3 className="font-display text-[17px] font-semibold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-display text-[16px] font-semibold">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="font-display text-[15px] font-semibold">{children}</h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted">{children}</blockquote>
          ),
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-[10px] border border-border">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 text-left font-mono text-[11px] tracking-wide text-muted uppercase">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-3 py-2 align-top">{children}</td>
          ),
          code: ({ className, children }) =>
            className?.includes("language-") ? (
              <code className="font-mono text-[12px]">{children}</code>
            ) : (
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12.5px] text-accent">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-border bg-bg/80 p-3 font-mono text-[12px] text-foreground/85">
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function MessageView({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("rise flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {!isUser && (
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-accent uppercase">
          <span className="size-1.5 rounded-full bg-accent" />
          argus
        </div>
      )}
      <div className={cn("w-full space-y-2", isUser && "flex justify-end")}>
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div
                key={index}
                className={cn(
                  isUser
                    ? "max-w-[85%] rounded-[12px] rounded-br-sm border border-border bg-surface-2 px-3.5 py-2.5 text-[14.5px]"
                    : "text-foreground/90",
                )}
              >
                {isUser ? (
                  <span className="whitespace-pre-wrap">{part.text}</span>
                ) : (
                  <Markdownish text={part.text} />
                )}
              </div>
            );
          }
          if (part.type === "reasoning" && part.text) {
            return (
              <div key={index} className="border-l-2 border-border pl-3 text-[13px] text-muted italic">
                {part.text}
              </div>
            );
          }
          if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
            const anyPart = part as unknown as {
              type: string;
              toolName?: string;
              state?: string;
              input?: unknown;
              output?: unknown;
              errorText?: string;
            };
            return (
              <ToolPart
                key={index}
                name={anyPart.toolName ?? anyPart.type.replace(/^tool-/, "")}
                state={anyPart.state}
                input={anyPart.input}
                output={anyPart.output}
                errorText={anyPart.errorText}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function Console() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Chat instance key: stays stable for the whole session so a conversation
  // created on the first message never resets the streaming state.
  const [sessionKey, setSessionKey] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<string | null>(null);
  const loadedRef = useRef<string | null>(null);

  const conversations = useConversations();
  const history = useConversationMessages(conversationId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();
  const saveMessages = useSaveMessages();
  const capabilities = useCapabilities();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/messages",
        body: () => ({ conversationId: conversationRef.current }),
      }),
    [],
  );

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: sessionKey,
    transport,
    onFinish: ({ messages: finished }) => {
      const id = conversationRef.current;
      if (!id) return;
      saveMessages.mutate({
        conversationId: id,
        messages: finished as unknown as { id: string; role: string }[],
      });
    },
  });

  function openConversation(id: string) {
    conversationRef.current = id;
    setConversationId(id);
    setSessionKey(id);
  }

  function newSession() {
    conversationRef.current = null;
    loadedRef.current = null;
    setConversationId(null);
    setSessionKey(crypto.randomUUID());
  }

  // Load a stored session into the chat, once per conversation switch.
  useEffect(() => {
    if (!conversationId || !history.data) return;
    if (loadedRef.current === conversationId) return;
    loadedRef.current = conversationId;
    if (history.data.length > 0) setMessages(history.data as unknown as UIMessage[]);
  }, [conversationId, history.data, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const busy = status === "streaming" || status === "submitted";

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    let id = conversationRef.current;
    if (!id) {
      const created = await createConversation.mutateAsync({
        title: value.slice(0, 48),
      });
      id = created!.id;
      conversationRef.current = id;
      loadedRef.current = id;
      setConversationId(id);
    } else if (messages.length === 0) {
      renameConversation.mutate({ id, title: value.slice(0, 48) });
    }
    sendMessage({ text: value }, { body: { conversationId: id } });
  }

  return (
    <Layout>
      <div className="flex h-full">
        {sidebarOpen && (
          <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface/40">
            <div className="flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={newSession}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-accent/30 bg-accent/10 py-2 font-mono text-[11px] text-accent transition-colors hover:bg-accent/20"
              >
                <Plus className="size-3.5" /> Nouvelle session
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-[8px] p-2 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
              {conversations.data?.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-[8px] px-2.5 py-2 text-[12.5px] transition-colors",
                    conversationId === conversation.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:bg-surface-2/60 hover:text-foreground",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openConversation(conversation.id)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {conversation.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteConversation.mutate({ id: conversation.id });
                      if (conversationRef.current === conversation.id) newSession();
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-border px-6 py-4">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-[8px] p-2 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="font-display text-lg font-semibold">Console</h1>
              <p className="font-mono text-[11px] text-muted">
                autonomie totale · {capabilities.data?.length ?? 0} outils armés
              </p>
            </div>
            {busy && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-accent">
                <span className="dot-live size-2 rounded-full bg-accent" />
                l'agent travaille
              </div>
            )}
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div
              className={cn(
                "mx-auto max-w-[820px] space-y-6",
                messages.length === 0 && "flex h-full flex-col justify-center",
              )}
            >
              {messages.length === 0 && (
                <div className="rise space-y-6 pb-10">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">
                      Donne un objectif, pas des étapes.
                    </h2>
                    <p className="mt-2 max-w-xl text-[14px] text-muted">
                      Argus cherche sur internet, pilote un vrai navigateur, exécute des commandes
                      shell, installe des logiciels, écrit et lance du code, appelle des APIs et
                      programme ses propres tâches. Sans demander de confirmation.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => submit(example)}
                        className="panel flex items-start gap-2 p-3 text-left text-[13px] text-foreground/80 transition-colors hover:border-accent/40 hover:bg-surface-2"
                      >
                        <Zap className="mt-0.5 size-3.5 shrink-0 text-accent" />
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <MessageView key={message.id} message={message} />
              ))}
            </div>
          </div>

          <div className="border-t border-border bg-surface/40 px-6 py-4">
            <div className="mx-auto flex max-w-[820px] items-end gap-2">
              <textarea
                aria-label="Message pour l'agent"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit(input);
                  }
                }}
                rows={1}
                placeholder="Que veux-tu que je fasse ?"
                className="max-h-40 min-h-[46px] flex-1 resize-none rounded-[10px] border border-border bg-surface px-3.5 py-3 font-display text-[14px] outline-none placeholder:text-muted/70 focus:border-accent/40"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex size-[46px] items-center justify-center rounded-[10px] border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
                >
                  <Square className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submit(input)}
                  disabled={!input.trim()}
                  className="flex size-[46px] items-center justify-center rounded-[10px] bg-accent text-bg transition-opacity hover:opacity-90 disabled:opacity-30"
                >
                  <ArrowUp className="size-5" strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Console;
