import { createFileRoute } from "@tanstack/react-router";
import { ranking } from "@/lib/stop/api";
import { PlayerAvatar } from "@/components/player-avatar";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/ranking")({ component: Ranking });

function Ranking() {
  const [scope, setScope] = useState<"global" | "friends">("global");
  const q = useQuery({
    queryKey: ["ranking", scope],
    queryFn: () => ranking({ data: { scope } }),
  });

  return (
    <main className="px-5 pt-10">
      <h1 className="font-display text-4xl tracking-tight">Ranking</h1>
      <div className="mt-5 grid grid-cols-2 rounded-full bg-elevated p-1">
        {(["global", "friends"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              "h-10 rounded-full text-sm font-medium",
              scope === s ? "bg-surface shadow-card" : "text-muted",
            )}
          >
            {s === "global" ? "Global" : "Amigos"}
          </button>
        ))}
      </div>
      <ol className="mt-6 space-y-2 pb-8">
        {q.data?.length ? (
          q.data.map((r) => (
            <li key={r.userId} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface px-3 py-3">
              <span className="w-6 text-center font-display text-lg text-subtle">{r.position}</span>
              <PlayerAvatar name={r.displayName} avatarId={r.avatarId} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.displayName}</p>
                <p className="text-xs text-subtle">
                  @{r.username} · {r.wins} vitórias
                </p>
              </div>
              <span className="tabular font-display text-xl">{r.totalPoints}</span>
            </li>
          ))
        ) : (
          <p className="text-sm text-muted">Ainda não há pontuações neste ranking.</p>
        )}
      </ol>
    </main>
  );
}
