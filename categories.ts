import type { CategoryDef } from "./types";

export const PRESET_CATEGORIES: CategoryDef[] = [
  { id: "nome", label: "Nome" },
  { id: "apelido", label: "Apelido" },
  { id: "animal", label: "Animal" },
  { id: "pais", label: "País" },
  { id: "cidade", label: "Cidade" },
  { id: "comida", label: "Comida" },
  { id: "bebida", label: "Bebida" },
  { id: "profissao", label: "Profissão" },
  { id: "objeto", label: "Objeto" },
  { id: "marca", label: "Marca" },
  { id: "filme", label: "Filme" },
  { id: "serie", label: "Série" },
  { id: "jogo", label: "Jogo" },
  { id: "personagem", label: "Personagem" },
  { id: "desporto", label: "Desporto" },
  { id: "clube", label: "Clube" },
  { id: "celebridade", label: "Celebridade" },
  { id: "planta", label: "Planta" },
  { id: "corpo", label: "Corpo humano" },
  { id: "tecnologia", label: "Tecnologia" },
  { id: "aplicacao", label: "Aplicação" },
  { id: "veiculo", label: "Veículo" },
];

export const DEFAULT_CATEGORY_IDS = [
  "nome",
  "apelido",
  "animal",
  "pais",
  "cidade",
  "comida",
  "profissao",
  "objeto",
] as const;

export const MIN_CATEGORIES = 8;
export const MAX_CATEGORIES = 16;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 12;
export const MIN_SECONDS = 10;
export const MAX_SECONDS = 180;
export const PRESET_SECONDS = [15, 30, 45, 60, 90, 120] as const;

export function categoryById(id: string): CategoryDef | undefined {
  return PRESET_CATEGORIES.find((c) => c.id === id);
}

export function customCategory(label: string): CategoryDef {
  const trimmed = label.trim().slice(0, 48);
  const id = `custom:${trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)}`;
  return { id, label: trimmed, custom: true };
}
