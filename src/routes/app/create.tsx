import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  customCategory,
  DEFAULT_CATEGORY_IDS,
  MIN_CATEGORIES,
  PRESET_CATEGORIES,
  PRESET_SECONDS,
} from "@/lib/game/categories";
import { ALPHABET, DEFAULT_LETTERS, HARD_LETTERS } from "@/lib/game/letters";
import { createRoom } from "@/lib/stop/api";
import type { CategoryDef, RoomMode } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/app/create")({ component: Create });

function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [mode, setMode] = useState<RoomMode>("private");
  const [cats, setCats] = useState<CategoryDef[]>(
    PRESET_CATEGORIES.filter((c) => DEFAULT_CATEGORY_IDS.includes(c.id as never)),
  );
  const [custom, setCustom] = useState("");
  const [letters, setLetters] = useState<string[]>(DEFAULT_LETTERS);
  const [seconds, setSeconds] = useState(60);
  const [customSeconds, setCustomSeconds] = useState("");
  const [rounds, setRounds] = useState(5);
  const [dup, setDup] = useState<0 | 5>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === 1) return cats.length >= MIN_CATEGORIES;
    if (step === 2) return letters.length >= 1;
    return true;
  }, [step, cats.length, letters.length]);

  function toggleCat(c: CategoryDef) {
    setCats((cur) => (cur.some((x) => x.id === c.id) ? cur.filter((x) => x.id !== c.id) : [...cur, c]));
  }
  function toggleLetter(l: string) {
    setLetters((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const secs = customSeconds ? Math.min(180, Math.max(10, Number(customSeconds))) : seconds;
      const { code } = await createRoom({
        data: {
          mode,
          maxPlayers,
          categories: cats,
          letters,
          roundSeconds: secs,
          totalRounds: rounds,
          duplicatePoints: dup,
        },
      });
      navigate({ to: "/app/room/$code", params: { code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a sala");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        {step === 0 ? (
          <Link to="/app" className="grid size-11 place-items-center rounded-full bg-elevated">
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="grid size-11 place-items-center rounded-full bg-elevated"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">Criar partida · {step + 1}/4</p>
          <h1 className="font-display text-3xl tracking-tight">
            {["Sala", "Categorias", "Letras", "Tempo"][step]}
          </h1>
        </div>
      </div>

      {step === 0 ? (
        <section className="mt-8 space-y-6">
          <div>
            <p className="text-sm font-medium">Jogadores</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxPlayers(n)}
                  className={cn(
                    "h-11 min-w-11 rounded-full px-3 text-sm",
                    maxPlayers === n ? "bg-stop text-stop-fg" : "bg-elevated",
                  )}
                >
                  {n === 12 ? "8+" : n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Modo</p>
            <div className="mt-3 grid gap-2">
              {(
                [
                  ["private", "Privado", "Entra quem tiver o código"],
                  ["public", "Público", "Aparece na lista de salas"],
                  ["friends", "Apenas amigos", "Só a tua lista de amigos"],
                ] as const
              ).map(([id, title, sub]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    "rounded-[var(--radius-lg)] border px-4 py-3 text-left",
                    mode === id ? "border-stop bg-surface" : "border-border bg-transparent",
                  )}
                >
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="mt-8">
          <p className="text-sm text-muted">
            Mínimo {MIN_CATEGORIES}. Selecionadas: {cats.length}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESET_CATEGORIES.map((c) => {
              const on = cats.some((x) => x.id === c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCat(c)}
                  className={cn(
                    "h-10 rounded-full px-4 text-sm",
                    on ? "bg-stop text-stop-fg" : "bg-elevated text-fg",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
            {cats.filter((c) => c.custom).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCats((cur) => cur.filter((x) => x.id !== c.id))}
                className="h-10 rounded-full bg-stop px-4 text-sm text-stop-fg"
              >
                {c.label}
              </button>
            ))}
          </div>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!custom.trim()) return;
              const c = customCategory(custom);
              if (!cats.some((x) => x.id === c.id)) setCats((cur) => [...cur, c]);
              setCustom("");
            }}
          >
            <Input
              placeholder="Categoria personalizada"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              Adicionar
            </Button>
          </form>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-8">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setLetters([...ALPHABET])}>
              Selecionar todas
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLetters([])}>
              Limpar
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {ALPHABET.map((l) => {
              const on = letters.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLetter(l)}
                  className={cn(
                    "grid aspect-square place-items-center rounded-[var(--radius-md)] font-display text-xl",
                    on ? "bg-stop text-stop-fg" : "bg-elevated text-subtle",
                    HARD_LETTERS.has(l) && !on && "opacity-70",
                  )}
                >
                  {l}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">{letters.length} letras ativas</p>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mt-8 space-y-6">
          <div>
            <p className="text-sm font-medium">Tempo de cada ronda</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_SECONDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSeconds(s);
                    setCustomSeconds("");
                  }}
                  className={cn(
                    "h-11 rounded-full px-4 text-sm",
                    !customSeconds && seconds === s ? "bg-stop text-stop-fg" : "bg-elevated",
                  )}
                >
                  {s}s
                </button>
              ))}
            </div>
            <Input
              className="mt-3"
              inputMode="numeric"
              placeholder="Personalizado (10–180s)"
              value={customSeconds}
              onChange={(e) => setCustomSeconds(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <p className="text-sm font-medium">Rondas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRounds(n)}
                  className={cn(
                    "h-11 min-w-11 rounded-full px-4",
                    rounds === n ? "bg-stop text-stop-fg" : "bg-elevated",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Respostas duplicadas</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDup(5)}
                className={cn("rounded-[var(--radius-lg)] border p-3 text-left", dup === 5 ? "border-stop" : "border-border")}
              >
                <p className="font-medium">5 pontos</p>
                <p className="text-xs text-muted">Regra clássica</p>
              </button>
              <button
                type="button"
                onClick={() => setDup(0)}
                className={cn("rounded-[var(--radius-lg)] border p-3 text-left", dup === 0 ? "border-stop" : "border-border")}
              >
                <p className="font-medium">0 pontos</p>
                <p className="text-xs text-muted">Só respostas únicas</p>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p className="mt-4 text-sm text-bad">{error}</p> : null}

      <div className="mt-10">
        {step < 3 ? (
          <Button className="w-full" size="xl" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Continuar
          </Button>
        ) : (
          <Button className="w-full" size="xl" disabled={busy} onClick={submit}>
            {busy ? "A criar sala…" : "Criar lobby"}
          </Button>
        )}
      </div>
    </main>
  );
}
