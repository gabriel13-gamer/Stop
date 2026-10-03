import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, UserPlus, Users, DoorOpen } from "lucide-react";

export const Route = createFileRoute("/app/play")({ component: Play });

function Play() {
  return (
    <main className="px-5 pt-10">
      <h1 className="font-display text-4xl tracking-tight">Jogar</h1>
      <p className="mt-2 text-sm text-muted">Cria uma sala ou junta-te a uma já aberta.</p>
      <div className="mt-8 grid gap-3">
        <Link to="/app/create" className="rounded-[var(--radius-xl)] bg-stop p-5 text-stop-fg">
          <p className="font-display text-3xl">Criar partida</p>
          <p className="mt-1 text-sm opacity-80">És o anfitrião. Tu escolhes as regras.</p>
        </Link>
        <Link to="/app/join" className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface p-5">
          <DoorOpen className="size-6 text-stop" />
          <div>
            <p className="font-medium">Entrar numa partida</p>
            <p className="text-sm text-muted">Código de 6 caracteres</p>
          </div>
        </Link>
        <Link to="/app/nearby" className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface p-5">
          <Radio className="size-6 text-stop" />
          <div>
            <p className="font-medium">Jogadores próximos</p>
            <p className="text-sm text-muted">Pessoas disponíveis neste momento</p>
          </div>
        </Link>
        <Link to="/app/friends" className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface p-5">
          <Users className="size-6 text-stop" />
          <div>
            <p className="font-medium">Jogar com amigos</p>
            <p className="text-sm text-muted">Lista, pedidos e convites</p>
          </div>
        </Link>
        <Link to="/app/create" search={{ friends: true } as never} className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-elevated p-5">
          <UserPlus className="size-6" />
          <div>
            <p className="font-medium">Sala só para amigos</p>
            <p className="text-sm text-muted">Modo privado entre a tua lista</p>
          </div>
        </Link>
      </div>
    </main>
  );
}
