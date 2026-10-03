import { firstLetter, looksLikeWord, normalizeAnswer } from "../utils.ts";
import { inDictionary } from "./dictionary.ts";
import type { AnswerStatus, CategoryDef } from "./types";

export type RawVerdict = {
  userId: string;
  categoryId: string;
  answer: string;
  status: AnswerStatus;
  points: number;
  needsVote: boolean;
  reason: string;
};

const NAME_LIKE = new Set(["nome", "apelido", "personagem", "celebridade"]);

export function letterOk(answer: string, letter: string): boolean {
  if (!answer.trim()) return false;
  return firstLetter(answer) === letter.toUpperCase();
}

export function classifyAnswer(
  category: CategoryDef,
  answer: string,
  letter: string,
): { status: Exclude<AnswerStatus, "duplicate">; needsVote: boolean; reason: string } {
  const trimmed = answer.trim();
  if (!trimmed) return { status: "empty", needsVote: false, reason: "vazia" };
  if (!letterOk(trimmed, letter)) {
    return { status: "invalid", needsVote: false, reason: "letra" };
  }
  if (!looksLikeWord(trimmed)) {
    return { status: "invalid", needsVote: false, reason: "lixo" };
  }
  if (category.custom || category.id.startsWith("custom:")) {
    return { status: "vote", needsVote: true, reason: "custom" };
  }
  if (inDictionary(category.id, trimmed)) {
    return { status: "valid", needsVote: false, reason: "dicionario" };
  }
  if (NAME_LIKE.has(category.id) && trimmed.length >= 3) {
    return { status: "vote", needsVote: true, reason: "nome-ambigua" };
  }
  return { status: "vote", needsVote: true, reason: "desconhecida" };
}

export function scoreRound(opts: {
  categories: CategoryDef[];
  letter: string;
  answersByUser: Record<string, Record<string, string>>;
  duplicatePoints: 0 | 5;
  uniquePoints?: number;
}): RawVerdict[] {
  const uniquePoints = opts.uniquePoints ?? 10;
  const out: RawVerdict[] = [];
  const users = Object.keys(opts.answersByUser);

  for (const cat of opts.categories) {
    const classified = users.map((userId) => {
      const answer = opts.answersByUser[userId]?.[cat.id] ?? "";
      const c = classifyAnswer(cat, answer, opts.letter);
      return { userId, answer: answer.trim(), ...c };
    });

    const groups = new Map<string, string[]>();
    for (const row of classified) {
      if (row.status === "empty" || row.status === "invalid") continue;
      const key = normalizeAnswer(row.answer);
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(row.userId);
      groups.set(key, list);
    }

    for (const row of classified) {
      if (row.status === "empty") {
        out.push({
          userId: row.userId,
          categoryId: cat.id,
          answer: "",
          status: "empty",
          points: 0,
          needsVote: false,
          reason: row.reason,
        });
        continue;
      }
      if (row.status === "invalid") {
        out.push({
          userId: row.userId,
          categoryId: cat.id,
          answer: row.answer,
          status: "invalid",
          points: 0,
          needsVote: false,
          reason: row.reason,
        });
        continue;
      }
      const key = normalizeAnswer(row.answer);
      const dup = (groups.get(key) ?? []).length > 1;
      if (row.needsVote) {
        out.push({
          userId: row.userId,
          categoryId: cat.id,
          answer: row.answer,
          status: "vote",
          points: 0,
          needsVote: true,
          reason: row.reason,
        });
        continue;
      }
      if (dup) {
        out.push({
          userId: row.userId,
          categoryId: cat.id,
          answer: row.answer,
          status: "duplicate",
          points: opts.duplicatePoints,
          needsVote: false,
          reason: "duplicada",
        });
      } else {
        out.push({
          userId: row.userId,
          categoryId: cat.id,
          answer: row.answer,
          status: "valid",
          points: uniquePoints,
          needsVote: false,
          reason: "unica",
        });
      }
    }
  }
  return out;
}

export function applyVotes(
  verdicts: RawVerdict[],
  votes: { categoryId: string; answerUserId: string; accept: boolean }[],
  answersByUser: Record<string, Record<string, string>>,
  duplicatePoints: 0 | 5,
): RawVerdict[] {
  const next = verdicts.map((v) => ({ ...v }));
  const tally = new Map<string, { accept: number; reject: number }>();
  for (const vote of votes) {
    const key = `${vote.categoryId}::${vote.answerUserId}`;
    const t = tally.get(key) ?? { accept: 0, reject: 0 };
    if (vote.accept) t.accept += 1;
    else t.reject += 1;
    tally.set(key, t);
  }

  for (const v of next) {
    if (!v.needsVote) continue;
    const t = tally.get(`${v.categoryId}::${v.userId}`);
    if (!t || t.accept + t.reject === 0) continue;
    const accepted = t.accept >= t.reject;
    v.needsVote = false;
    if (!accepted) {
      v.status = "invalid";
      v.points = 0;
      v.reason = "voto-rejeitada";
    } else {
      v.status = "valid";
      v.reason = "voto-aceite";
    }
  }

  for (const v of next) {
    if (v.status !== "valid" && v.status !== "duplicate") continue;
    if (v.needsVote) continue;
    const key = normalizeAnswer(v.answer);
    const peers = next.filter(
      (o) =>
        o.categoryId === v.categoryId &&
        !o.needsVote &&
        (o.status === "valid" || o.status === "duplicate") &&
        normalizeAnswer(o.answer) === key,
    );
    if (peers.length > 1) {
      v.status = "duplicate";
      v.points = duplicatePoints;
    } else {
      v.status = "valid";
      v.points = 10;
    }
  }

  void answersByUser;
  return next;
}

export function totalsByUser(verdicts: RawVerdict[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of verdicts) {
    out[v.userId] = (out[v.userId] ?? 0) + v.points;
  }
  return out;
}
