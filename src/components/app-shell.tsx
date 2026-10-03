import { Link, useRouterState } from "@tanstack/react-router";
import { House, Gamepad2, Trophy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const TABS = [
  { to: "/app", label: "Início", icon: House, exact: true },
  { to: "/app/play", label: "Jogar", icon: Gamepad2 },
  { to: "/app/ranking", label: "Ranking", icon: Trophy },
  { to: "/app/profile", label: "Perfil", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showNav = TABS.some((t) =>
    "exact" in t && t.exact ? pathname === t.to : pathname === t.to,
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-bg text-fg">
      <div className={cn("flex-1", showNav && "pb-24")}>{children}</div>
      {showNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          <ul className="grid grid-cols-4 px-2 pt-2 pb-2">
            {TABS.map((tab) => {
              const active =
                "exact" in tab && tab.exact ? pathname === tab.to : pathname === tab.to;
              const Icon = tab.icon;
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[var(--radius-md)] py-1.5 text-[11px] font-medium",
                      active ? "text-stop" : "text-subtle",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
