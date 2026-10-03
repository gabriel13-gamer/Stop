import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authClient } from "@/lib/auth/client";
import { bootstrapProfile } from "@/lib/stop/api";
import { Button } from "@/components/ui/button";
import { StopMark } from "@/components/stop-mark";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guest() {
    setBusy(true);
    setError(null);
    try {
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      const email = `guest.${id}@stop.play`;
      const password = `${id}Aa1!stop`;
      const res = await authClient.signUp.email({
        email,
        password,
        name: "Convidado",
      });
      if (res.error) throw new Error(res.error.message ?? "Não foi possível entrar");
      await bootstrapProfile({
        data: { displayName: "Convidado", email, guest: true },
      });
      navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha a entrar como convidado");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return <Navigate to="/app" />;
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-between overflow-hidden bg-bg px-6 pb-10 pt-16 text-fg">
      <div className="rise-in flex flex-col items-center text-center">
        <StopMark size={88} />
        <h1 className="mt-8 font-display text-7xl leading-none tracking-tight">STOP</h1>
        <p className="mt-3 text-lg text-muted">Joga. Pensa. Para!</p>
        <p className="mt-6 max-w-xs text-sm leading-relaxed text-subtle">
          Partidas em tempo real, letras à sorte, STOP a qualquer momento e pontuação automática.
        </p>
      </div>

      <div className="rise-in flex flex-col gap-3" style={{ animationDelay: "80ms" }}>
        {error ? <p className="text-center text-sm text-bad">{error}</p> : null}
        {isPending ? (
          <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-elevated" />
        ) : (
          <>
            <Button size="xl" className="w-full" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="xl" variant="secondary" className="w-full" asChild>
              <Link to="/signup">Criar conta</Link>
            </Button>
            <Button size="lg" variant="ghost" className="w-full" disabled={busy} onClick={guest}>
              {busy ? "A preparar…" : "Jogar como convidado"}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
