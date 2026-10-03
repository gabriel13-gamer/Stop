import { createFileRoute, Link } from "@tanstack/react-router";
import { historyDetail } from "@/lib/stop/api";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/app/history/$id")({ component: HistoryDetail });

function HistoryDetail() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["history", id],
    queryFn: () => historyDetail({ data: { id } }),
  });
  const h = q.data;
  return (
    <main className="px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/app/history" className="grid size-11 place-items-center rounded-full bg-elevated">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Partida</h1>
      </div>
      {!h ? (
        <p className="mt-8 text-sm text-muted">A carregar…</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            Sala {h.roomCode} · {h.totalRounds} rondas
          </p>
          <ul className="mt-4 space-y-2">
            {(h.players as { name: string; score: number }[]).map((p, i) => (
              <li key={i} className="flex justify-between rounded-[var(--radius-md)] bg-surface px-3 py-2 text-sm">
                <span>{p.name}</span>
                <span className="tabular">{p.score}</span>
              </li>
            ))}
          </ul>
          <ol className="mt-8 space-y-4">
            {(h.rounds as { round: number; letter: string; stop_kind: string | null; scores: Record<string, number> }[]).map(
              (r) => (
                <li key={r.round} className="rounded-[var(--radius-lg)] bg-surface p-4">
                  <p className="text-sm font-medium">
                    Ronda {r.round} · letra {r.letter}
                  </p>
                  <p className="text-xs text-subtle">
                    {r.stop_kind === "auto" ? "STOP automático" : "STOP manual"}
                  </p>
                </li>
              ),
            )}
          </ol>
        </>
      )}
    </main>
  );
}
