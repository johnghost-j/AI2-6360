import { Link, useLocation } from "wouter";
import {
  Terminal,
  Activity,
  CalendarClock,
  FolderTree,
  Settings,
  Eye,
} from "lucide-react";
import { cn } from "../lib/utils";

const NAV = [
  { href: "/", label: "Console", icon: Terminal },
  { href: "/activity", label: "Activité", icon: Activity },
  { href: "/tasks", label: "Tâches", icon: CalendarClock },
  { href: "/workspace", label: "Workspace", icon: FolderTree },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export const CATEGORY_COLOR: Record<string, string> = {
  web: "text-info",
  network: "text-info",
  system: "text-warn",
  code: "text-warn",
  files: "text-accent",
  schedule: "text-violet",
  memory: "text-violet",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-dvh overflow-hidden grid-bg">
      <nav className="flex w-[74px] shrink-0 flex-col items-center gap-1 border-r border-border bg-surface/60 py-4 backdrop-blur">
        <Link
          href="/"
          className="mb-4 flex size-11 items-center justify-center rounded-[10px] border border-accent/30 bg-accent/10"
          title="Argus"
        >
          <Eye className="size-5 text-accent" strokeWidth={2.2} />
        </Link>

        {NAV.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex w-[58px] flex-col items-center gap-1 rounded-[10px] py-2.5 transition-colors",
                active
                  ? "bg-accent/12 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.9} />
              <span className="font-mono text-[9px] tracking-wide uppercase">{label}</span>
              {active && (
                <span className="absolute top-1/2 -left-[1px] h-6 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}

        <div className="mt-auto font-mono text-[9px] text-muted/60">v1</div>
      </nav>

      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-8 py-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 font-mono text-[11px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
