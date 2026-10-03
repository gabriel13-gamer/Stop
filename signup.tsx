import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bootstrapProfile, usernameAvailable } from "@/lib/stop/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StopMark } from "@/components/stop-mark";
import { useState } from "react";

export const Route = createFileRoute("/signup")({ component: Signup });

function strongPassword(pw: string): string | null {
  if (pw.length < 8) return "A palavra-passe precisa de pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Usa letras e números.";
  return null;
}

function Signup() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <Navigate to="/app" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username: 3–20 letras, números ou _.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido.");
      return;
    }
    const pwErr = strongPassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const avail = await usernameAvailable({ data: { username } });
      if (!avail.available) throw new Error("Este username já está em uso");
      const res = await authClient.signUp.email({
        email,
        password,
        name: username,
      });
      if (res.error) throw new Error(res.error.message ?? "Não foi possível criar a conta");
      await bootstrapProfile({
        data: { displayName: username, email },
      });
      navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no registo");
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
      <h1 className="font-display text-4xl tracking-tight">Criar conta</h1>
      <p className="mt-2 text-sm text-muted">Escolhe um username único. A sessão fica guardada neste dispositivo.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="u">Username</Label>
          <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="e">Email</Label>
          <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="p">Palavra-passe</Label>
          <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="c">Confirmar palavra-passe</Label>
          <Input id="c" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "A criar…" : "Criar conta"}
        </Button>
      </form>
      <div className="mt-8 flex flex-col gap-2">
        {authEnabled
          ? GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                onClick={() => signIn(p.providerId, { callbackURL: "/app" })}
              >
                Continuar com {p.label}
              </Button>
            ))
          : null}
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Já tens conta?{" "}
        <Link to="/login" className="text-fg underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
