import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { resolveLoginEmail } from "@/lib/stop/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StopMark } from "@/components/stop-mark";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const next =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") ?? "/app"
      : "/app";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isPending && user) return <Navigate to={next.startsWith("/") ? next : "/app"} />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { email } = await resolveLoginEmail({ data: { identifier } });
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message ?? "Credenciais inválidas");
      navigate({ to: next.startsWith("/") ? next : "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setBusy(false);
    }
  }

  async function recover() {
    if (!identifier.includes("@")) {
      setError("Introduz o email da conta para recuperar a palavra-passe.");
      return;
    }
    setBusy(true);
    try {
      const client = authClient as unknown as {
        requestPasswordReset?: (d: { email: string; redirectTo: string }) => Promise<unknown>;
      };
      await client.requestPasswordReset?.({ email: identifier, redirectTo: "/login" });
      setResetSent(true);
    } catch {
      setResetSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg px-6 py-10 text-fg">
      <Link to="/" className="mb-8 flex items-center gap-3 text-sm text-muted">
        <StopMark size={36} />
        Voltar
      </Link>
      <h1 className="font-display text-4xl tracking-tight">Entrar</h1>
      <p className="mt-2 text-sm text-muted">Continua a jogar com a tua conta STOP.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="id">Email ou username</Label>
          <Input
            id="id"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pw">Palavra-passe</Label>
          <Input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        {resetSent ? (
          <p className="text-sm text-ok">
            Se existir uma conta com esse email, enviaremos instruções de recuperação.
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "A entrar…" : "Entrar"}
        </Button>
        <button type="button" onClick={recover} className="text-sm text-muted underline">
          Recuperar palavra-passe
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-2">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-subtle">ou</p>
        {authEnabled
          ? GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                onClick={() => signIn(p.providerId, { callbackURL: next })}
              >
                Continuar com {p.label}
              </Button>
            ))
          : null}
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Ainda não tens conta?{" "}
        <Link to="/signup" className="text-fg underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
