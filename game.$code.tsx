import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/player-avatar";
import { closeVerification, nextRound, pressStop, saveAnswers, voteAnswer } from "@/lib/stop/api";
import { useRoom } from "@/lib/stop/use-room";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { formatClock } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";

export const Route = createFileRoute("/app/game/$code")({ component: Game });

function useRemaining(endsAt: string | null, serverNow: string | undefined) {
  const [ms, setMs] = useState(0);
  const origin = useRef({ fetched: Date.now(), server: Date.parse(serverNow ?? "") });
  useEffect(() => {
    origin.current = { fetched: Date.now(), server: Date.parse(serverNow ?? "") };
  }, [serverNow, endsAt]);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const { fetched, server } = origin.current;
      const now = Date.now() + (server - fetched);
      setMs(Date.parse(endsAt) - now);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return ms;
}

function Game() {
  const { code } = Route.useParams();
  const room = useRoom(code);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const data = room.data;

  if (room.isError) {
    return (
      <main className="px-5 pt-16 text-center">
        <p className="text-bad">{(room.error as Error).message}</p>
        <Button className="mt-4" asChild>
          <Link to="/app">Início</Link>
        </Button>
      </main>
    );
  }
  if (!data) return <div className="p-10 text-sm text-muted">A sincronizar…</div>;
  if (data.status === "lobby") return <Navigate to="/app/room/$code" params={{ code }} />;

  if (data.status === "playing") {
    return <PlayRound code={code} />;
  }
  if (data.status === "verifying") {
    return <VerifyRound code={code} />;
  }
  if (data.status === "results") {
    return <RoundOver code={code} />;
  }
  return <Finale code={code} onHome={() => navigate({ to: "/app" })} userId={user?.id} />;
}

function PlayRound({ code }: { code: string }) {
  const room = useRoom(code);
  const data = room.data!;
  const [answers, setAnswers] = useState<Record<string, string>>(data.myAnswers);
  const remaining = useRemaining(data.roundEndsAt, data.serverNow);
  const saving = useRef<number | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    setAnswers((cur) => ({ ...data.myAnswers, ...cur }));
  }, [data.currentRound]);

  useEffect(() => {
    if (saving.current) window.clearTimeout(saving.current);
    saving.current = window.setTimeout(() => {
      void saveAnswers({ data: { code, answers: answersRef.current } });
    }, 280);
    return () => {
      if (saving.current) window.clearTimeout(saving.current);
    };
  }, [answers, code]);

  const secs = remaining / 1000;
  const urgent = secs <= 10 && secs > 0;
  const last5 = secs <= 5 && secs > 0;

  return (
    <main className="relative min-h-dvh px-4 pb-36 pt-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">
            Ronda {data.currentRound}/{data.totalRounds}
          </p>
          <p className="font-display text-[92px] leading-[0.85] tracking-tight">{data.currentLetter}</p>
        </div>
        <div className={`text-right tabular ${urgent ? "text-stop" : ""}`}>
          <p className="text-xs text-subtle">Tempo</p>
          <p className="font-display text-4xl">{formatClock(secs)}</p>
        </div>
      </header>

      <div className="mt-4 space-y-3">
        {data.categories.map((c) => (
          <label key={c.id} className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-subtle">
              {c.label}
            </span>
            <Input
              value={answers[c.id] ?? ""}
              onChange={(e) => setAnswers((s) => ({ ...s, [c.id]: e.target.value }))}
              placeholder={`${data.currentLetter}…`}
              autoCapitalize="words"
            />
          </label>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-6 pt-8">
        <Button
          size="xl"
          className="h-16 w-full font-display text-2xl tracking-[0.2em]"
          onClick={async () => {
            await saveAnswers({ data: { code, answers: answersRef.current } });
            await pressStop({ data: { code } });
          }}
        >
          STOP
        </Button>
      </div>

      {last5 ? (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-bg/55">
          <p key={Math.ceil(secs)} className="tick-pop font-display text-8xl text-stop">
            {Math.ceil(secs)}
          </p>
        </div>
      ) : null}
    </main>
  );
}

function VerifyRound({ code }: { code: string }) {
  const room = useRoom(code);
  const user = useCurrentUser();
  const data = room.data!;
  const stopper = data.players.find((p) => p.userId === data.stopBy);
  const byCat = useMemo(() => {
    const map = new Map<string, typeof data.verdicts>();
    for (const v of data.verdicts) {
      const list = map.get(v.categoryId) ?? [];
      list.push(v);
      map.set(v.categoryId, list);
    }
    return data.categories.map((c) => ({ cat: c, items: map.get(c.id) ?? [] }));
  }, [data]);
  const pending = data.verdicts.some((v) => v.needsVote);
  const isHost = data.hostId === user?.id;

  return (
    <main className="px-4 pb-10 pt-6">
      <p className="stamp-in text-center font-display text-3xl tracking-tight">
        {data.stopKind === "auto" ? "Tempo esgotado. STOP automático." : `${stopper?.displayName ?? "Alguém"} carregou em STOP`}
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Letra {data.currentLetter} · verificação
      </p>
      <div className="mt-6 space-y-5">
        {byCat.map(({ cat, items }) => (
          <section key={cat.id} className="rounded-[var(--radius-lg)] bg-surface p-4">
            <p className="text-xs uppercase tracking-wider text-subtle">
              {cat.label} — {data.currentLetter}
            </p>
            <ul className="mt-3 space-y-3">
              {items.map((item) => {
                const player = data.players.find((p) => p.userId === item.userId);
                const tone =
                  item.status === "valid"
                    ? "text-ok"
                    : item.status === "duplicate"
                      ? "text-warn"
                      : item.status === "vote" || item.needsVote
                        ? "text-warn"
                        : "text-bad";
                const label =
                  item.status === "valid"
                    ? `Válida — ${item.points} pts`
                    : item.status === "duplicate"
                      ? `Duplicada — ${item.points} pts`
                      : item.needsVote
                        ? "Verificação necessária"
                        : item.status === "empty"
                          ? "Vazia — 0 pts"
                          : "Inválida — 0 pts";
                return (
                  <li key={`${item.userId}-${cat.id}`} className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar name={player?.displayName ?? "?"} avatarId={player?.avatarId ?? "s1"} size={32} />
                      <div>
                        <p className="text-xs text-subtle">{player?.displayName}</p>
                        <p className="font-medium">{item.answer || "—"}</p>
                        <p className={`text-xs ${tone}`}>{label}</p>
                      </div>
                    </div>
                    {item.needsVote && item.userId !== user?.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            voteAnswer({
                              data: { code, categoryId: cat.id, answerUserId: item.userId, accept: true },
                            }).then(() => room.refetch())
                          }
                        >
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            voteAnswer({
                              data: { code, categoryId: cat.id, answerUserId: item.userId, accept: false },
                            }).then(() => room.refetch())
                          }
                        >
                          Rejeitar
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {isHost ? (
        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={() => closeVerification({ data: { code } }).then(() => room.refetch())}
        >
          {pending ? "Fechar votação e pontuar" : "Ver resultado"}
        </Button>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">À espera da pontuação final desta ronda…</p>
      )}
    </main>
  );
}

function RoundOver({ code }: { code: string }) {
  const room = useRoom(code);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const data = room.data!;
  const ranked = [...data.players].sort((a, b) => b.score - a.score);
  const stopper = data.players.find((p) => p.userId === data.stopBy);
  const isHost = data.hostId === user?.id;
  const last = data.currentRound >= data.totalRounds;

  return (
    <main className="px-5 pb-10 pt-8">
      <p className="text-center text-xs uppercase tracking-[0.18em] text-subtle">Ronda terminada</p>
      <h1 className="mt-2 text-center font-display text-4xl">Ronda {data.currentRound}</h1>
      <p className="mt-2 text-center text-sm text-muted">
        {data.stopKind === "auto"
          ? "STOP automático — tempo esgotado"
          : `STOP feito por: ${stopper?.displayName ?? "—"}`}
      </p>
      <ol className="mt-8 space-y-2">
        {ranked.map((p, i) => (
          <li key={p.userId} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-6 font-display text-lg text-subtle">{i + 1}</span>
              <PlayerAvatar name={p.displayName} avatarId={p.avatarId} size={36} />
              <span className="font-medium">{p.displayName}</span>
            </div>
            <span className="tabular font-display text-xl">{p.score}</span>
          </li>
        ))}
      </ol>
      {isHost ? (
        <Button
          className="mt-8 w-full"
          size="xl"
          onClick={async () => {
            const res = await nextRound({ data: { code } });
            if (res.done) navigate({ to: "/app/game/$code", params: { code } });
          }}
        >
          {last ? "Ver pódio" : "Próxima ronda"}
        </Button>
      ) : (
        <p className="mt-8 text-center text-sm text-muted">À espera do anfitrião…</p>
      )}
    </main>
  );
}

function Finale({
  code,
  onHome,
  userId,
}: {
  code: string;
  onHome: () => void;
  userId?: string;
}) {
  const room = useRoom(code);
  const data = room.data!;
  const ranked = [...data.players].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3);
  const shareText = ranked.map((p, i) => `${i + 1}. ${p.displayName} — ${p.score} pts`).join("\n");

  return (
    <main className="px-5 pb-12 pt-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-subtle">Fim da partida</p>
      <h1 className="mt-2 font-display text-5xl">Pódio</h1>
      <div className="mt-8 flex items-end justify-center gap-3">
        { [1, 0, 2].map((idx) => {
          const p = top[idx];
          if (!p) return <div key={idx} className="w-24" />;
          const h = idx === 0 ? "h-36" : idx === 1 ? "h-28" : "h-24";
          return (
            <div key={p.userId} className="flex w-24 flex-col items-center">
              <PlayerAvatar name={p.displayName} avatarId={p.avatarId} size={idx === 0 ? 64 : 48} />
              <p className="mt-2 truncate text-sm font-medium">{p.displayName}</p>
              <p className="tabular text-xs text-muted">{p.score} pts</p>
              <div className={`mt-3 w-full rounded-t-[var(--radius-md)] bg-elevated ${h} grid place-items-start pt-2`}>
                <span className="w-full font-display text-2xl">{idx === 0 ? "1" : idx === 1 ? "2" : "3"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <ul className="mt-8 space-y-2 text-left">
        {ranked.map((p) => (
          <li key={p.userId} className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 text-sm">
            <div className="flex justify-between font-medium">
              <span>{p.displayName}</span>
              <span className="tabular">{p.score}</span>
            </div>
            <p className="mt-1 text-xs text-subtle">
              Certas {p.correct} · Inválidas {p.invalid} · Melhor ronda {p.bestRound} · STOPs {p.stops} · Rondas ganhas {p.roundsWon}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const text = `STOP ${code}\n${shareText}`;
            if (navigator.share) void navigator.share({ title: "STOP", text });
            else void navigator.clipboard.writeText(text);
          }}
        >
          <Share2 className="size-4" /> Partilhar resultado
        </Button>
        <Button asChild>
          <Link to="/app/create">Jogar novamente</Link>
        </Button>
        <Button variant="ghost" onClick={onHome}>
          Voltar ao início
        </Button>
      </div>
      {userId && ranked[0]?.userId === userId ? (
        <p className="mt-4 text-sm text-ok">Ganhaste esta partida.</p>
      ) : null}
    </main>
  );
}
