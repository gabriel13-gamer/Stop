import { createFileRoute, Link } from "@tanstack/react-router";
import { useTheme, type ThemeMode } from "@/components/theme";
import { UserButton } from "@/lib/auth/gates";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const { mode, setMode } = useTheme();
  const modes: { id: ThemeMode; label: string }[] = [
    { id: "system", label: "Sistema" },
    { id: "light", label: "Claro" },
    { id: "dark", label: "Escuro" },
  ];
  return (
    <main className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <Link to="/app" className="grid size-11 place-items-center rounded-full bg-elevated">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Definições</h1>
      </div>
      <section className="mt-8">
        <p className="text-sm font-medium">Aparência</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "h-12 rounded-[var(--radius-md)] text-sm",
                mode === m.id ? "bg-stop text-stop-fg" : "bg-elevated",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-8 rounded-[var(--radius-lg)] bg-surface p-4">
        <p className="font-medium">Instalar no Android</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Abre o menu do Chrome e escolhe <strong>Adicionar ao ecrã principal</strong> ou{" "}
          <strong>Instalar aplicação</strong>. O STOP fica com ícone próprio, ecrã cheio e funciona como uma app
          instalada.
        </p>
      </section>
      <section className="mt-6">
        <p className="text-sm font-medium">Sessão</p>
        <div className="mt-3">
          <UserButton />
        </div>
      </section>
    </main>
  );
}
