import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinRoom, publicLobbies } from "@/lib/stop/api";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/join")({ component: Join });

function Join() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const publicRooms = useQuery({ queryKey: ["public-lobbies"], queryFn: () => publicLobbies(), refetchInterval: 4000 });

  async function go(raw: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await joinRoom({ data: { code: raw } });
      navigate({ to: "/app/room/$code", params: { code: res.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sala inexistente");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/app" className="grid size-11 place-items-center rounded-full bg-elevated">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Entrar</h1>
      </div>
      <form
        className="mt-8 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void go(code);
        }}
      >
        <Input
          placeholder="ABCD12"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="text-center font-display text-2xl tracking-[0.3em]"
          maxLength={8}
        />
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="xl" disabled={busy || code.length < 4}>
          Entrar na sala
        </Button>
      </form>
      <section className="mt-10">
        <p className="text-xs uppercase tracking-[0.18em] text-subtle">Salas públicas</p>
        <ul className="mt-3 space-y-2">
          {publicRooms.data?.length ? (
            publicRooms.data.map((r) => (
              <li key={r.code}>
                <button
                  type="button"
                  onClick={() => go(r.code)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-surface px-4 py-3 text-left"
                >
                  <span>
                    <span className="font-display tracking-wide">{r.code}</span>
                    <span className="ml-2 text-sm text-muted">{r.hostName}</span>
                  </span>
                  <span className="text-sm text-subtle">
                    {r.players}/{r.maxPlayers}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <p className="text-sm text-muted">Nenhuma sala pública de momento.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
