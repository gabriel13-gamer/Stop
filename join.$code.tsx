import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { joinRoom } from "@/lib/stop/api";
import { Button } from "@/components/ui/button";
import { StopMark } from "@/components/stop-mark";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/join/$code")({ component: JoinLink });

function JoinLink() {
  const { code } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      sessionStorage.setItem("stop.join", code.toUpperCase());
      return;
    }
    let cancelled = false;
    joinRoom({ data: { code } })
      .then(({ code: joined }) => {
        if (!cancelled) navigate({ to: "/app/room/$code", params: { code: joined } });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível entrar");
      });
    return () => {
      cancelled = true;
    };
  }, [user, isPending, code, navigate]);

  if (!isPending && !user) {
    return <Navigate to="/login" search={{ next: `/join/${code}` } as never} />;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
      <div>
        <StopMark size={64} className="mx-auto" />
        <p className="mt-4 text-sm text-muted">{error ?? "A entrar na sala…"}</p>
        {error ? (
          <Button className="mt-6" onClick={() => navigate({ to: "/app/join" })}>
            Introduzir código
          </Button>
        ) : null}
      </div>
    </main>
  );
}
