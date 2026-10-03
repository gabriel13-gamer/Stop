import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/player-avatar";
import { addBot, invitePlayer, kickPlayer, leaveRoom, listFriends, startMatch } from "@/lib/stop/api";
import { useRoom } from "@/lib/stop/use-room";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Share2, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/room/$code")({ component: Room });

function Room() {
  const { code } = Route.useParams();
  const room = useRoom(code);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const [copied, setCopied] = useState(false);

  const data = room.data;
  if (room.isError) {
    return (
      <main className="px-5 pt-16 text-center">
        <p className="text-bad">{(room.error as Error).message}</p>
        <Button className="mt-4" asChild>
          <Link to="/app">Voltar</Link>
        </Button>
      </main>
    );
  }
  if (!data) {
    return <div className="p-10 text-sm text-muted">A ligar à sala…</div>;
  }
  if (data.status === "playing" || data.status === "verifying" || data.status === "results") {
    return <Navigate to="/app/game/$code" params={{ code }} />;
  }
  if (data.status === "finished") {
    return <Navigate to="/app/game/$code" params={{ code }} />;
  }

  const meHost = data.hostId === user?.id;
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/join/${data.code}` : `/join/${data.code}`;
  const humans = data.players.filter((p) => !p.isBot).length;

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast(label);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full bg-elevated"
          onClick={async () => {
            await leaveRoom({ data: { code } });
            navigate({ to: "/app" });
          }}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">Sala</p>
          <h1 className="font-display text-4xl tracking-[0.12em]">{data.code}</h1>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={() => copy(data.code, "Código copiado")}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Código
        </Button>
        <Button variant="secondary" onClick={() => copy(link, "Link copiado")}>
          Link
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({ title: "STOP", text: `Entra na minha partida STOP`, url: link });
            } else {
              void copy(link, "Link copiado");
            }
          }}
        >
          <Share2 className="size-4" />
          Convite
        </Button>
      </div>
      <p className="mt-3 text-xs text-subtle">stop://join/{data.code}</p>

      <section className="mt-8">
        <p className="text-sm font-medium">
          Jogadores {data.players.length}/{data.maxPlayers}
        </p>
        <ul className="mt-3 space-y-2">
          {data.players.map((p) => (
            <li key={p.userId} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-ok" />
                <PlayerAvatar name={p.displayName} avatarId={p.avatarId} size={36} />
                <div>
                  <p className="font-medium">
                    {p.displayName} {p.isHost ? <span className="text-xs text-subtle">HOST</span> : null}
                    {p.isBot ? <span className="text-xs text-subtle"> virtual</span> : null}
                  </p>
                  <p className="text-xs text-subtle">@{p.username}</p>
                </div>
              </div>
              {meHost && p.userId !== user?.id ? (
                <button
                  type="button"
                  className="text-xs text-bad"
                  onClick={() => kickPlayer({ data: { code, userId: p.userId } }).then(() => room.refetch())}
                >
                  Expulsar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {meHost ? (
        <div className="mt-4">
          <Button variant="outline" className="w-full" onClick={() => addBot({ data: { code } }).then(() => room.refetch())}>
            Adicionar jogador virtual
          </Button>
          <p className="mt-2 text-xs text-subtle">Útil para treinar sozinho. A pontuação dos bots não entra no ranking.</p>
        </div>
      ) : null}

      {meHost && friends.data?.friends.length ? (
        <section className="mt-6">
          <p className="text-sm font-medium">Convidar amigos</p>
          <ul className="mt-2 space-y-2">
            {friends.data.friends.map((f) => (
              <li key={f.userId} className="flex items-center justify-between">
                <span className="text-sm">{f.displayName}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => invitePlayer({ data: { roomCode: code, toId: f.userId } }).then(() => toast("Convite enviado"))}
                >
                  Convidar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-sm text-muted">
        {data.categories.length} categorias · {data.letters.length} letras · {data.roundSeconds}s · {data.totalRounds} rondas
      </p>

      {meHost ? (
        <Button
          className="mt-6 w-full"
          size="xl"
          disabled={data.players.length < 2}
          onClick={async () => {
            await startMatch({ data: { code } });
            navigate({ to: "/app/game/$code", params: { code } });
          }}
        >
          Começar partida
        </Button>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">À espera do anfitrião…</p>
      )}
      {humans < 2 && meHost ? (
        <p className="mt-2 text-center text-xs text-subtle">Mínimo 2 jogadores (podes adicionar um virtual).</p>
      ) : null}
    </main>
  );
}
