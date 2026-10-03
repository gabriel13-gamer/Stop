import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMe, myInvites, respondInvite } from "@/lib/stop/api";
import { PlayerAvatar } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { levelFromPoints, winRate } from "@/lib/utils";
import { Clock3, Settings, Trophy, UserPlus, Users, Radio } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const invites = useQuery({ queryKey: ["invites"], queryFn: () => myInvites(), refetchInterval: 4000 });
  const p = me.data;

  return (
    <main className="px-5 pt-8">
      <header className="flex items-center justify-between">
        <Link to="/app/profile" className="flex items-center gap-3">
          <PlayerAvatar name={p?.displayName ?? "…"} avatarId={p?.avatarId ?? "s1"} size={48} />
          <div>
            <p className="text-xs text-subtle">Olá</p>
            <p className="font-medium leading-tight">{p?.displayName ?? "Jogador"}</p>
          </div>
        </Link>
        <Link
          to="/app/settings"
          className="grid size-11 place-items-center rounded-full bg-elevated text-muted"
          aria-label="Definições"
        >
          <Settings className="size-5" />
        </Link>
      </header>

      {p ? (
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { k: "Nível", v: String(levelFromPoints(p.totalPoints)) },
            { k: "Vitórias", v: String(p.wins) },
            { k: "Win %", v: `${winRate(p.wins, p.gamesPlayed)}%` },
          ].map((s) => (
            <div key={s.k} className="rounded-[var(--radius-lg)] bg-surface p-3 shadow-card">
              <p className="text-[11px] uppercase tracking-wider text-subtle">{s.k}</p>
              <p className="mt-1 font-display text-2xl tabular leading-none">{s.v}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 h-24 animate-pulse rounded-[var(--radius-lg)] bg-elevated" />
      )}

      {invites.data?.length ? (
        <section className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-sm font-medium">Convites</p>
          <ul className="mt-3 space-y-3">
            {invites.data.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-medium">{inv.fromName}</span> convidou-te · {inv.roomCode}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const res = await respondInvite({ data: { id: inv.id, accept: true } });
                      if (res.code) navigate({ to: "/app/room/$code", params: { code: res.code } });
                    }}
                  >
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respondInvite({ data: { id: inv.id, accept: false } }).then(() => invites.refetch())}
                  >
                    Recusar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">Jogar</p>
        <div className="mt-3 grid gap-3">
          <Link
            to="/app/create"
            className="rounded-[var(--radius-xl)] bg-stop p-5 text-stop-fg shadow-card"
          >
            <p className="font-display text-3xl leading-none">Criar partida</p>
            <p className="mt-2 text-sm opacity-80">Categorias, letras, tempo e convites.</p>
          </Link>
          <Link
            to="/app/join"
            className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-card"
          >
            <p className="font-display text-2xl leading-none">Entrar numa partida</p>
            <p className="mt-2 text-sm text-muted">Código ou link de convite.</p>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/app/nearby" className="rounded-[var(--radius-lg)] bg-elevated p-4">
            <Radio className="size-5 text-stop" />
            <p className="mt-3 font-medium">Jogadores próximos</p>
            <p className="mt-1 text-xs text-subtle">Disponíveis agora</p>
          </Link>
          <Link to="/app/friends" className="rounded-[var(--radius-lg)] bg-elevated p-4">
            <Users className="size-5 text-stop" />
            <p className="mt-3 font-medium">Jogar com amigos</p>
            <p className="mt-1 text-xs text-subtle">Convidar da lista</p>
          </Link>
        </div>
      </section>

      <section className="mt-8 mb-4 grid grid-cols-3 gap-2">
        <Link to="/app/profile" className="grid place-items-center gap-2 rounded-[var(--radius-lg)] bg-surface py-4 text-xs">
          <UserPlus className="size-4" /> Perfil
        </Link>
        <Link to="/app/history" className="grid place-items-center gap-2 rounded-[var(--radius-lg)] bg-surface py-4 text-xs">
          <Clock3 className="size-4" /> Histórico
        </Link>
        <Link to="/app/ranking" className="grid place-items-center gap-2 rounded-[var(--radius-lg)] bg-surface py-4 text-xs">
          <Trophy className="size-4" /> Ranking
        </Link>
      </section>
    </main>
  );
}
