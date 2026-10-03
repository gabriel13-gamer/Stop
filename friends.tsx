import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  createRoom,
  invitePlayer,
  listFriends,
  respondFriend,
  searchUsers,
  sendFriendRequest,
} from "@/lib/stop/api";
import { DEFAULT_CATEGORY_IDS, PRESET_CATEGORIES } from "@/lib/game/categories";
import { DEFAULT_LETTERS } from "@/lib/game/letters";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/friends")({ component: Friends });

function Friends() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends(), refetchInterval: 4000 });
  const results = useQuery({
    queryKey: ["search", q],
    enabled: q.trim().length >= 2,
    queryFn: () => searchUsers({ data: { q } }),
  });

  async function invite(toId: string) {
    const cats = PRESET_CATEGORIES.filter((c) => DEFAULT_CATEGORY_IDS.includes(c.id as never));
    const { code } = await createRoom({
      data: {
        mode: "friends",
        maxPlayers: 8,
        categories: cats,
        letters: DEFAULT_LETTERS,
        roundSeconds: 60,
        totalRounds: 5,
        duplicatePoints: 5,
      },
    });
    await invitePlayer({ data: { roomCode: code, toId } });
    toast("Convite enviado");
    navigate({ to: "/app/room/$code", params: { code } });
  }

  return (
    <main className="px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/app" className="grid size-11 place-items-center rounded-full bg-elevated">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Amigos</h1>
      </div>
      <Input className="mt-6" placeholder="Procurar username" value={q} onChange={(e) => setQ(e.target.value)} />
      {results.data?.length ? (
        <ul className="mt-3 space-y-2">
          {results.data.map((u) => (
            <li key={u.userId} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3 py-2">
              <div className="flex items-center gap-2">
                <PlayerAvatar name={u.displayName} avatarId={u.avatarId} size={36} />
                <div>
                  <p className="text-sm font-medium">{u.displayName}</p>
                  <p className="text-xs text-subtle">@{u.username}</p>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => sendFriendRequest({ data: { toId: u.userId } }).then(() => friends.refetch())}>
                Adicionar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {friends.data?.incoming.length ? (
        <section className="mt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">Pedidos recebidos</p>
          <ul className="mt-3 space-y-2">
            {friends.data.incoming.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3 py-2">
                <span className="text-sm">{f.displayName}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondFriend({ data: { id: f.id, accept: true } }).then(() => friends.refetch())}>
                    Aceitar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => respondFriend({ data: { id: f.id, accept: false } }).then(() => friends.refetch())}>
                    Recusar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {friends.data?.outgoing.length ? (
        <section className="mt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">Pedidos enviados</p>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {friends.data.outgoing.map((f) => (
              <li key={f.id}>@{f.username}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.18em] text-subtle">Amigos</p>
        <ul className="mt-3 space-y-2">
          {friends.data?.friends.length ? (
            friends.data.friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3 py-2">
                <div className="flex items-center gap-2">
                  <PlayerAvatar name={f.displayName} avatarId={f.avatarId} size={36} />
                  <span className="text-sm font-medium">{f.displayName}</span>
                </div>
                <Button size="sm" onClick={() => invite(f.userId)}>
                  Convidar
                </Button>
              </li>
            ))
          ) : (
            <p className="text-sm text-muted">Ainda não tens amigos. Procura um username.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
