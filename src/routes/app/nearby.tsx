import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/player-avatar";
import { createRoom, getMe, invitePlayer, listNearby, setLooking } from "@/lib/stop/api";
import { DEFAULT_CATEGORY_IDS, PRESET_CATEGORIES } from "@/lib/game/categories";
import { DEFAULT_LETTERS } from "@/lib/game/letters";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/nearby")({ component: Nearby });

function Nearby() {
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const nearby = useQuery({
    queryKey: ["nearby"],
    queryFn: () => listNearby(),
    refetchInterval: 2500,
  });
  const [ble, setBle] = useState<string | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { bluetooth?: unknown };
    if (!nav.bluetooth) {
      setBle("A descoberta Bluetooth não está disponível neste dispositivo. A mostrar jogadores com a app aberta e disponíveis.");
    } else {
      setBle("Bluetooth disponível neste dispositivo. A descoberta de pares usa presença na app (o browser não permite anunciar STOP via Nearby Connections).");
    }
  }, []);

  const looking = me.data?.looking ?? false;

  const toggle = useMutation({
    mutationFn: (on: boolean) => setLooking({ data: { looking: on } }),
    onSuccess: () => me.refetch(),
  });

  async function invite(toId: string) {
    const cats = PRESET_CATEGORIES.filter((c) => DEFAULT_CATEGORY_IDS.includes(c.id as never));
    const { code } = await createRoom({
      data: {
        mode: "private",
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
    <main className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/app" className="grid size-11 place-items-center rounded-full bg-elevated">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Próximos</h1>
      </div>
      <p className="mt-4 text-sm text-muted">{ble}</p>
      <div className="mt-5 rounded-[var(--radius-lg)] bg-surface p-4">
        <p className="font-medium">Disponível para jogar</p>
        <p className="mt-1 text-sm text-subtle">Outros jogadores vêem-te nesta lista enquanto a app estiver aberta.</p>
        <Button className="mt-4 w-full" variant={looking ? "secondary" : "primary"} onClick={() => toggle.mutate(!looking)}>
          {looking ? "Deixar de aparecer" : "Ficar disponível"}
        </Button>
      </div>
      <ul className="mt-6 space-y-2">
        {nearby.data?.length ? (
          nearby.data.map((p) => (
            <li key={p.userId} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3 py-3">
              <div className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-ok" />
                <PlayerAvatar name={p.displayName} avatarId={p.avatarId} size={40} />
                <div>
                  <p className="font-medium">{p.displayName}</p>
                  <p className="text-xs text-subtle">Disponível para jogar</p>
                </div>
              </div>
              <Button size="sm" onClick={() => invite(p.userId)}>
                Convidar
              </Button>
            </li>
          ))
        ) : (
          <p className="text-sm text-muted">Ninguém disponível neste momento. Ativa o teu estado e pede a um amigo para abrir a app.</p>
        )}
      </ul>
    </main>
  );
}
