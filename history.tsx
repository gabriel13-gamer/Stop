import { createFileRoute, Link } from "@tanstack/react-router";
import { listHistory } from "@/lib/stop/api";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/app/history")({ component: History });

function History() {
  const q = useQuery({ queryKey: ["history"], queryFn: () => listHistory() });
  return (
    <main className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/app" className="grid size-11 place-items-center rounded-full bg-elevated">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Histórico</h1>
      </div>
      <ul className="mt-6 space-y-2">
        {q.data?.length ? (
          q.data.map((h) => (
            <li key={h.id}>
              <Link
                to="/app/history/$id"
                params={{ id: h.id }}
                className="block rounded-[var(--radius-lg)] bg-surface px-4 py-3"
              >
                <div className="flex justify-between">
                  <p className="font-medium">{h.winnerName ?? "Empate"} ganhou</p>
                  <p className="tabular text-sm">{h.myScore} pts</p>
                </div>
                <p className="mt-1 text-xs text-subtle">
                  {new Date(h.playedAt).toLocaleString("pt-PT")} · {h.totalRounds} rondas · {h.players.length} jogadores · {h.roomCode}
                </p>
              </Link>
            </li>
          ))
        ) : (
          <p className="text-sm text-muted">Ainda não jogaste nenhuma partida completa.</p>
        )}
      </ul>
    </main>
  );
}
