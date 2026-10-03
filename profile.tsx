import { createFileRoute, Link } from "@tanstack/react-router";
import { getMe, updateProfile } from "@/lib/stop/api";
import { AVATARS } from "@/lib/game/avatars";
import { PlayerAvatar } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserButton } from "@/lib/auth/gates";
import { levelFromPoints, winRate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({ component: Profile });

function Profile() {
  const q = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const p = q.data;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("s1");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!p) return;
    setName(p.displayName);
    setUsername(p.username);
    setAvatar(p.avatarId);
  }, [p]);

  if (!p) return <div className="p-10 text-sm text-muted">A carregar perfil…</div>;

  return (
    <main className="px-5 pb-10 pt-10">
      <div className="flex items-start justify-between">
        <h1 className="font-display text-4xl tracking-tight">Perfil</h1>
        <UserButton />
      </div>
      <div className="mt-8 flex flex-col items-center">
        <PlayerAvatar name={name || p.displayName} avatarId={avatar} size={88} />
        <p className="mt-3 font-medium">{p.displayName}</p>
        <p className="text-sm text-subtle">@{p.username}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {[
          ["Nível", String(levelFromPoints(p.totalPoints))],
          ["Vitórias", String(p.wins)],
          ["Partidas", String(p.gamesPlayed)],
          ["Pontos", String(p.totalPoints)],
          ["Melhor", String(p.bestScore)],
          ["Win %", `${winRate(p.wins, p.gamesPlayed)}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[var(--radius-lg)] bg-surface p-3">
            <p className="text-[11px] uppercase tracking-wider text-subtle">{k}</p>
            <p className="mt-1 font-display text-2xl tabular">{v}</p>
          </div>
        ))}
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          try {
            await updateProfile({ data: { displayName: name, username, avatarId: avatar } });
            await q.refetch();
            setMsg("Perfil atualizado");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Falha a guardar");
          }
        }}
      >
        <p className="text-sm font-medium">Avatar</p>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatar(a.id)}
              className={cn("rounded-full ring-offset-2 ring-offset-bg", avatar === a.id && "ring-2 ring-stop")}
            >
              <PlayerAvatar name={name || "S"} avatarId={a.id} size={44} />
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Nome apresentado</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
        <Button type="submit" className="w-full">
          Guardar
        </Button>
      </form>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button variant="secondary" asChild>
          <Link to="/app/history">Histórico</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/app/friends">Amigos</Link>
        </Button>
      </div>
    </main>
  );
}
