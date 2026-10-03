import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import {
  MAX_CATEGORIES,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MAX_SECONDS,
  MIN_CATEGORIES,
  MIN_PLAYERS,
  MIN_ROUNDS,
  MIN_SECONDS,
} from "@/lib/game/categories";
import { pickWord } from "@/lib/game/dictionary";
import { ALPHABET } from "@/lib/game/letters";
import type {
  CategoryDef,
  HistorySummary,
  Invite,
  PlayerPublic,
  Profile,
  RankRow,
  RoomMode,
  RoomState,
  RoomStatus,
  StopKind,
  VerdictItem,
} from "@/lib/game/types";
import { applyVotes, scoreRound, totalsByUser, type RawVerdict } from "@/lib/game/validate";
import { levelFromPoints, roomCode, slugifyUsername } from "@/lib/utils";

type RoomRow = {
  code: string;
  host_id: string;
  mode: RoomMode;
  max_players: number;
  categories: unknown;
  letters: unknown;
  used_letters: unknown;
  round_seconds: number;
  total_rounds: number;
  duplicate_points: number;
  status: RoomStatus;
  current_round: number;
  current_letter: string | null;
  round_started_at: unknown;
  round_ends_at: unknown;
  stop_by: string | null;
  stop_kind: StopKind | null;
};

const BOTS = [
  { id: "bot:gabriel", username: "gabriel_bot", displayName: "Gabriel", avatarId: "s2" },
  { id: "bot:joana", username: "joana_bot", displayName: "Joana", avatarId: "s5" },
  { id: "bot:miguel", username: "miguel_bot", displayName: "Miguel", avatarId: "s4" },
  { id: "bot:sofia", username: "sofia_bot", displayName: "Sofia", avatarId: "s3" },
] as const;

function asJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

function iso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}

function nid(prefix = ""): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return prefix + [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function botMeta(id: string) {
  return BOTS.find((b) => b.id === id);
}

async function uniqueUsername(sql: Sql, seed: string): Promise<string> {
  const base = slugifyUsername(seed);
  for (let i = 0; i < 12; i += 1) {
    const candidate = i === 0 ? base : `${base}${i + 2}`;
    const rows = await sql<{ n: number }>`select count(*)::int as n from profiles where username = ${candidate}`;
    if ((rows[0]?.n ?? 0) === 0) return candidate;
  }
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

async function ensureProfileRow(
  sql: Sql,
  userId: string,
  hint?: { displayName?: string | null; email?: string | null; guest?: boolean },
): Promise<Profile> {
  const existing = await sql<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_id: string;
    is_guest: boolean;
    looking: boolean;
    last_seen: unknown;
    wins: number;
    games_played: number;
    total_points: number;
    best_score: number;
    stops: number;
    created_at: unknown;
  }>`select * from profiles where user_id = ${userId}`;
  if (existing[0]) {
    await sql`update profiles set last_seen = now() where user_id = ${userId}`;
    const r = existing[0];
    return {
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarId: r.avatar_id,
      isGuest: r.is_guest,
      looking: r.looking,
      lastSeen: iso(r.last_seen) ?? new Date().toISOString(),
      wins: r.wins,
      gamesPlayed: r.games_played,
      totalPoints: r.total_points,
      bestScore: r.best_score,
      stops: r.stops,
      createdAt: iso(r.created_at) ?? new Date().toISOString(),
    };
  }
  const display = (hint?.displayName || hint?.email?.split("@")[0] || "Jogador").slice(0, 32);
  const username = await uniqueUsername(sql, hint?.guest ? `c${userId.slice(0, 6)}` : display);
  await sql`insert into profiles (user_id, username, display_name, is_guest)
    values (${userId}, ${username}, ${display}, ${Boolean(hint?.guest)})`;
  return ensureProfileRow(sql, userId, hint);
}

function mapProfile(r: Profile): Profile & { level: number } {
  return { ...r, level: levelFromPoints(r.totalPoints) };
}

async function loadRoom(sql: Sql, code: string): Promise<RoomRow | null> {
  const rows = await sql<RoomRow>`select * from rooms where code = ${code}`;
  return rows[0] ?? null;
}

async function loadPlayers(sql: Sql, code: string): Promise<PlayerPublic[]> {
  const rows = await sql<{
    user_id: string;
    is_host: boolean;
    is_bot: boolean;
    connected: boolean;
    score: number;
    stops: number;
    correct: number;
    invalid: number;
    best_round: number;
    rounds_won: number;
    username: string | null;
    display_name: string | null;
    avatar_id: string | null;
  }>`
    select rp.user_id, rp.is_host, rp.is_bot, rp.connected, rp.score, rp.stops, rp.correct, rp.invalid,
           rp.best_round, rp.rounds_won, p.username, p.display_name, p.avatar_id
    from room_players rp
    left join profiles p on p.user_id = rp.user_id
    where rp.room_code = ${code}
    order by rp.joined_at asc
  `;
  return rows.map((r) => {
    const bot = r.is_bot ? botMeta(r.user_id) : undefined;
    return {
      userId: r.user_id,
      username: r.username ?? bot?.username ?? r.user_id.slice(0, 10),
      displayName: r.display_name ?? bot?.displayName ?? "Jogador",
      avatarId: r.avatar_id ?? bot?.avatarId ?? "s1",
      isHost: r.is_host,
      isBot: r.is_bot,
      connected: r.connected,
      score: r.score,
      stops: r.stops,
      correct: r.correct,
      invalid: r.invalid,
      bestRound: r.best_round,
      roundsWon: r.rounds_won,
    };
  });
}

async function areFriends(sql: Sql, a: string, b: string): Promise<boolean> {
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from friend_requests
    where status = 'accepted'
      and ((from_id = ${a} and to_id = ${b}) or (from_id = ${b} and to_id = ${a}))
  `;
  return (rows[0]?.n ?? 0) > 0;
}

function pickLetter(letters: string[], used: string[]): string {
  const pool = letters.filter((l) => !used.includes(l));
  const source = pool.length ? pool : letters;
  return source[Math.floor(Math.random() * source.length)] ?? "A";
}

function botAnswers(categories: CategoryDef[], letter: string): Record<string, string> {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  for (const cat of categories) {
    const word = pickWord(cat.id, letter, used);
    if (word) {
      out[cat.id] = word;
      used.add(word.toLowerCase());
    }
  }
  return out;
}

async function aiResolve(items: RawVerdict[], categories: CategoryDef[], letter: string): Promise<RawVerdict[]> {
  const pending = items.filter((i) => i.needsVote && i.answer);
  if (!pending.length) return items;
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return items;
  try {
    const payload = pending.map((p, i) => ({
      i,
      category: categories.find((c) => c.id === p.categoryId)?.label ?? p.categoryId,
      answer: p.answer,
    }));
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "Valida respostas do jogo STOP/Adedonha em português. Responde APENAS JSON: {\"r\":[{\"i\":0,\"ok\":true}]}. ok=true só se a resposta pertencer à categoria e for uma palavra real. A letra já foi verificada.",
          },
          {
            role: "user",
            content: `Letra ${letter}. ${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) return items;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return items;
    const parsed = JSON.parse(match[0]) as { r?: { i: number; ok: boolean }[] };
    const map = new Map((parsed.r ?? []).map((x) => [x.i, x.ok]));
    return items.map((item) => {
      const idx = pending.indexOf(item);
      if (idx < 0 || !map.has(idx)) return item;
      const ok = map.get(idx);
      if (ok) return { ...item, needsVote: false, status: "valid" as const, reason: "ia" };
      return { ...item, needsVote: false, status: "invalid" as const, points: 0, reason: "ia" };
    });
  } catch {
    return items;
  }
}

async function finalizeRound(sql: Sql, room: RoomRow, stopBy: string, stopKind: StopKind) {
  const code = room.code;
  const round = room.current_round;
  const letter = room.current_letter ?? "A";
  const categories = asJson<CategoryDef[]>(room.categories, []);
  const duplicatePoints = (room.duplicate_points === 0 ? 0 : 5) as 0 | 5;

  await sql`update rooms set status = 'verifying', stop_by = ${stopBy}, stop_kind = ${stopKind}, round_ends_at = now()
    where code = ${code} and status = 'playing'`;

  const players = await sql<{ user_id: string; is_bot: boolean }>`
    select user_id, is_bot from room_players where room_code = ${code}`;
  const existing = await sql<{ user_id: string; answers: unknown }>`
    select user_id, answers from round_answers where room_code = ${code} and round = ${round}`;
  const byUser: Record<string, Record<string, string>> = {};
  for (const row of existing) {
    byUser[row.user_id] = asJson(row.answers, {});
  }
  for (const p of players) {
    if (!byUser[p.user_id]) {
      const answers = p.is_bot ? botAnswers(categories, letter) : {};
      byUser[p.user_id] = answers;
      await sql.query(
        `insert into round_answers (room_code, round, user_id, answers, locked)
         values ($1,$2,$3,$4::jsonb,true)
         on conflict (room_code, round, user_id) do update set answers = excluded.answers, locked = true`,
        [code, round, p.user_id, JSON.stringify(answers)],
      );
    } else {
      await sql`update round_answers set locked = true where room_code = ${code} and round = ${round} and user_id = ${p.user_id}`;
    }
  }

  let verdicts = scoreRound({ categories, letter, answersByUser: byUser, duplicatePoints });
  verdicts = await aiResolve(verdicts, categories, letter);
  const stillVote = verdicts.some((v) => v.needsVote);
  if (!stillVote) {
    const rescored = applyVotes(verdicts, [], byUser, duplicatePoints);
    await persistResults(sql, room, stopBy, stopKind, rescored, true);
  } else {
    await sql.query(
      `insert into round_results (room_code, round, letter, stop_by, stop_kind, items, scores)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
       on conflict (room_code, round) do update set items = excluded.items, scores = excluded.scores`,
      [code, round, letter, stopBy, stopKind, JSON.stringify(verdicts), JSON.stringify(totalsByUser(verdicts))],
    );
  }
}

async function persistResults(
  sql: Sql,
  room: RoomRow,
  stopBy: string,
  stopKind: StopKind,
  verdicts: RawVerdict[],
  applyScores: boolean,
) {
  const scores = totalsByUser(verdicts);
  await sql.query(
    `insert into round_results (room_code, round, letter, stop_by, stop_kind, items, scores)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
     on conflict (room_code, round) do update set items = excluded.items, scores = excluded.scores, stop_by = excluded.stop_by, stop_kind = excluded.stop_kind`,
    [room.code, room.current_round, room.current_letter, stopBy, stopKind, JSON.stringify(verdicts), JSON.stringify(scores)],
  );
  if (!applyScores) return;
  const players = await loadPlayers(sql, room.code);
  let best = -1;
  const winners: string[] = [];
  for (const p of players) {
    const add = scores[p.userId] ?? 0;
    const correct = verdicts.filter((v) => v.userId === p.userId && (v.status === "valid" || v.status === "duplicate")).length;
    const invalid = verdicts.filter((v) => v.userId === p.userId && (v.status === "invalid" || v.status === "empty")).length;
    const newScore = p.score + add;
    const bestRound = Math.max(p.bestRound, add);
    if (add > best) {
      best = add;
      winners.length = 0;
      winners.push(p.userId);
    } else if (add === best) {
      winners.push(p.userId);
    }
    await sql`update room_players set score = ${newScore}, correct = correct + ${correct}, invalid = invalid + ${invalid},
      best_round = ${bestRound}
      where room_code = ${room.code} and user_id = ${p.userId}`;
  }
  for (const w of winners) {
    await sql`update room_players set rounds_won = rounds_won + 1 where room_code = ${room.code} and user_id = ${w}`;
  }
  if (stopKind === "manual" && !stopBy.startsWith("bot:")) {
    await sql`update room_players set stops = stops + 1 where room_code = ${room.code} and user_id = ${stopBy}`;
  }
  await sql`update rooms set status = 'results' where code = ${room.code}`;
}

async function maybeAutoStop(sql: Sql, room: RoomRow): Promise<RoomRow> {
  if (room.status !== "playing" || !room.round_ends_at) return room;
  const end = Date.parse(String(iso(room.round_ends_at)));
  if (Number.isNaN(end) || Date.now() < end) return room;
  await finalizeRound(sql, room, "auto", "auto");
  return (await loadRoom(sql, room.code)) ?? room;
}

async function assembleState(sql: Sql, userId: string, code: string): Promise<RoomState> {
  let room = await loadRoom(sql, code);
  if (!room) throw new Error("Sala inexistente");
  room = await maybeAutoStop(sql, room);
  const players = await loadPlayers(sql, code);
  const mine = players.find((p) => p.userId === userId);
  if (!mine) throw new Error("Não estás nesta sala");

  await sql`update room_players set connected = true, last_seen = now() where room_code = ${code} and user_id = ${userId}`;

  const ansRows = room.current_round
    ? await sql<{ answers: unknown }>`
        select answers from round_answers
        where room_code = ${code} and round = ${room.current_round} and user_id = ${userId}`
    : [];
  const resultRows =
    room.status === "verifying" || room.status === "results" || room.status === "finished"
      ? await sql<{ items: unknown; scores: unknown }>`
          select items, scores from round_results
          where room_code = ${code} and round = ${room.current_round}`
      : [];
  const voteRows =
    room.status === "verifying"
      ? await sql<{ category_id: string; answer_user_id: string; accept: boolean }>`
          select category_id, answer_user_id, accept from answer_votes
          where room_code = ${code} and round = ${room.current_round}`
      : [];

  const rawItems = asJson<RawVerdict[]>(resultRows[0]?.items, []);
  const voteCount = new Map<string, { a: number; r: number }>();
  for (const v of voteRows) {
    const k = `${v.category_id}::${v.answer_user_id}`;
    const t = voteCount.get(k) ?? { a: 0, r: 0 };
    if (v.accept) t.a += 1;
    else t.r += 1;
    voteCount.set(k, t);
  }
  const verdicts: VerdictItem[] = rawItems.map((item) => {
    const t = voteCount.get(`${item.categoryId}::${item.userId}`);
    return {
      userId: item.userId,
      categoryId: item.categoryId,
      answer: item.answer,
      status: item.status,
      points: item.points,
      needsVote: item.needsVote,
      acceptVotes: t?.a ?? 0,
      rejectVotes: t?.r ?? 0,
    };
  });

  const invites = await sql<{
    id: string;
    room_code: string;
    from_id: string;
    to_id: string;
    status: string;
    created_at: unknown;
    display_name: string | null;
  }>`
    select i.*, p.display_name
    from room_invites i
    left join profiles p on p.user_id = i.from_id
    where i.to_id = ${userId} and i.status = 'pending'
    order by i.created_at desc
    limit 12
  `;

  return {
    code: room.code,
    hostId: room.host_id,
    mode: room.mode,
    maxPlayers: room.max_players,
    categories: asJson(room.categories, []),
    letters: asJson(room.letters, []),
    usedLetters: asJson(room.used_letters, []),
    roundSeconds: room.round_seconds,
    totalRounds: room.total_rounds,
    duplicatePoints: room.duplicate_points === 0 ? 0 : 5,
    status: room.status,
    currentRound: room.current_round,
    currentLetter: room.current_letter,
    roundStartedAt: iso(room.round_started_at),
    roundEndsAt: iso(room.round_ends_at),
    stopBy: room.stop_by,
    stopKind: room.stop_kind,
    serverNow: new Date().toISOString(),
    players: await loadPlayers(sql, code),
    myAnswers: asJson(ansRows[0]?.answers, {}),
    verdicts,
    roundScores: asJson(resultRows[0]?.scores, {}),
    incomingInvites: invites.map(
      (i): Invite => ({
        id: i.id,
        roomCode: i.room_code,
        fromId: i.from_id,
        fromName: i.display_name ?? "Jogador",
        toId: i.to_id,
        status: i.status,
        createdAt: iso(i.created_at) ?? "",
      }),
    ),
  };
}

async function startRoundAt(sql: Sql, room: RoomRow, round: number) {
  const letters = asJson<string[]>(room.letters, ALPHABET);
  const used = asJson<string[]>(room.used_letters, []);
  const letter = pickLetter(letters, used);
  const nextUsed = [...used, letter];
  const start = new Date();
  const end = new Date(start.getTime() + room.round_seconds * 1000);
  await sql.query(
    `update rooms set status = 'playing', current_round = $1, current_letter = $2, used_letters = $3::jsonb,
      round_started_at = $4, round_ends_at = $5, stop_by = null, stop_kind = null
     where code = $6`,
    [round, letter, JSON.stringify(nextUsed), start.toISOString(), end.toISOString(), room.code],
  );
  const players = await sql<{ user_id: string; is_bot: boolean }>`
    select user_id, is_bot from room_players where room_code = ${room.code}`;
  const categories = asJson<CategoryDef[]>(room.categories, []);
  for (const p of players) {
    const answers = p.is_bot ? botAnswers(categories, letter) : {};
    await sql.query(
      `insert into round_answers (room_code, round, user_id, answers, locked)
       values ($1,$2,$3,$4::jsonb,false)
       on conflict (room_code, round, user_id) do nothing`,
      [room.code, round, p.user_id, JSON.stringify(answers)],
    );
  }
}

async function finishMatch(sql: Sql, room: RoomRow) {
  const players = await loadPlayers(sql, room.code);
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const rounds = await sql<{ round: number; letter: string; stop_by: string | null; stop_kind: string | null; items: unknown; scores: unknown }>`
    select round, letter, stop_by, stop_kind, items, scores from round_results where room_code = ${room.code} order by round`;
  const id = nid("m_");
  const payload = ranked.map((p) => ({
    userId: p.userId,
    name: p.displayName,
    username: p.username,
    avatarId: p.avatarId,
    score: p.score,
    correct: p.correct,
    invalid: p.invalid,
    bestRound: p.bestRound,
    roundsWon: p.roundsWon,
    stops: p.stops,
    isBot: p.isBot,
  }));
  await sql.query(
    `insert into match_history (id, room_code, winner_id, total_rounds, players, rounds)
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
    [id, room.code, winner?.userId ?? null, room.total_rounds, JSON.stringify(payload), JSON.stringify(rounds)],
  );
  for (const p of ranked) {
    if (p.isBot) continue;
    const won = winner && p.userId === winner.userId ? 1 : 0;
    await sql`update profiles set
      games_played = games_played + 1,
      wins = wins + ${won},
      total_points = total_points + ${p.score},
      best_score = greatest(best_score, ${p.score}),
      stops = stops + ${p.stops}
      where user_id = ${p.userId}`;
    await sql`insert into history_players (history_id, user_id) values (${id}, ${p.userId}) on conflict do nothing`;
  }
  await sql`update rooms set status = 'finished' where code = ${room.code}`;
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfileRow(sql, context.userId);
    return mapProfile(profile);
  });

export const bootstrapProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { displayName?: string; email?: string; guest?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfileRow(sql, context.userId, data);
    return mapProfile(profile);
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { displayName?: string; username?: string; avatarId?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    if (data.username) {
      const u = slugifyUsername(data.username);
      const clash = await sql<{ user_id: string }>`select user_id from profiles where username = ${u} and user_id <> ${context.userId}`;
      if (clash[0]) throw new Error("Este username já está em uso");
      await sql`update profiles set username = ${u} where user_id = ${context.userId}`;
    }
    if (data.displayName) {
      const n = data.displayName.trim().slice(0, 32);
      if (n.length < 2) throw new Error("Nome demasiado curto");
      await sql`update profiles set display_name = ${n} where user_id = ${context.userId}`;
    }
    if (data.avatarId) {
      await sql`update profiles set avatar_id = ${data.avatarId} where user_id = ${context.userId}`;
    }
    return mapProfile(await ensureProfileRow(sql, context.userId));
  });

export const usernameAvailable = createServerFn({ method: "POST" })
  .validator((d: { username: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const u = slugifyUsername(data.username);
    const rows = await sql<{ n: number }>`select count(*)::int as n from profiles where username = ${u}`;
    return { available: (rows[0]?.n ?? 0) === 0, username: u };
  });

export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((d: { identifier: string }) => d)
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim();
    if (identifier.includes("@")) return { email: identifier };
    const sql = await getSql();
    const rows = await sql<{ email: string }>`
      select u.email as email
      from profiles p
      join "user" u on u.id = p.user_id
      where lower(p.username) = ${identifier.toLowerCase()}
      limit 1`;
    return { email: rows[0]?.email ?? `${identifier}@invalid.local` };
  });

export const setLooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { looking: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    await sql`update profiles set looking = ${data.looking}, last_seen = now() where user_id = ${context.userId}`;
    return { looking: data.looking };
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      mode: RoomMode;
      maxPlayers: number;
      categories: CategoryDef[];
      letters: string[];
      roundSeconds: number;
      totalRounds: number;
      duplicatePoints: 0 | 5;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    if (data.categories.length < MIN_CATEGORIES) throw new Error("Escolhe pelo menos 8 categorias");
    if (data.categories.length > MAX_CATEGORIES) throw new Error("Demasiadas categorias");
    if (data.letters.length < 1) throw new Error("Escolhe pelo menos uma letra");
    if (data.maxPlayers < MIN_PLAYERS || data.maxPlayers > MAX_PLAYERS) throw new Error("Número de jogadores inválido");
    if (data.roundSeconds < MIN_SECONDS || data.roundSeconds > MAX_SECONDS) throw new Error("Tempo inválido");
    if (data.totalRounds < MIN_ROUNDS || data.totalRounds > MAX_ROUNDS) throw new Error("Rondas inválidas");
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    let code = roomCode();
    for (let i = 0; i < 8; i += 1) {
      const exists = await sql<{ code: string }>`select code from rooms where code = ${code}`;
      if (!exists[0]) break;
      code = roomCode();
    }
    await sql.query(
      `insert into rooms (code, host_id, mode, max_players, categories, letters, round_seconds, total_rounds, duplicate_points, status)
       values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,'lobby')`,
      [
        code,
        context.userId,
        data.mode,
        data.maxPlayers,
        JSON.stringify(data.categories),
        JSON.stringify(data.letters.map((l) => l.toUpperCase())),
        data.roundSeconds,
        data.totalRounds,
        data.duplicatePoints,
      ],
    );
    await sql`insert into room_players (room_code, user_id, is_host) values (${code}, ${context.userId}, true)`;
    return { code };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    const code = data.code.trim().toUpperCase();
    const room = await loadRoom(sql, code);
    if (!room) throw new Error("Sala inexistente");
    const existing = await sql<{ user_id: string }>`
      select user_id from room_players where room_code = ${code} and user_id = ${context.userId}`;
    if (existing[0]) {
      await sql`update room_players set connected = true, last_seen = now() where room_code = ${code} and user_id = ${context.userId}`;
      return { code };
    }
    if (room.status !== "lobby") throw new Error("Esta partida já começou");
    const count = await sql<{ n: number }>`select count(*)::int as n from room_players where room_code = ${code}`;
    if ((count[0]?.n ?? 0) >= room.max_players) throw new Error("Sala cheia");
    if (room.mode === "friends") {
      const ok = await areFriends(sql, context.userId, room.host_id);
      if (!ok && context.userId !== room.host_id) throw new Error("Esta sala é só para amigos do anfitrião");
    }
    await sql`insert into room_players (room_code, user_id, is_host) values (${code}, ${context.userId}, false)`;
    return { code };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const room = await loadRoom(sql, code);
    if (!room) return { ok: true };
    if (room.status === "lobby") {
      await sql`delete from room_players where room_code = ${code} and user_id = ${context.userId}`;
      if (room.host_id === context.userId) {
        const next = await sql<{ user_id: string }>`
          select user_id from room_players where room_code = ${code} and is_bot = false order by joined_at limit 1`;
        if (next[0]) {
          await sql`update rooms set host_id = ${next[0].user_id} where code = ${code}`;
          await sql`update room_players set is_host = true where room_code = ${code} and user_id = ${next[0].user_id}`;
        } else {
          await sql`delete from rooms where code = ${code}`;
        }
      }
    } else {
      await sql`update room_players set connected = false, last_seen = now() where room_code = ${code} and user_id = ${context.userId}`;
    }
    return { ok: true };
  });

export const kickPlayer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string; userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room || room.host_id !== context.userId) throw new Error("Só o anfitrião pode expulsar");
    if (room.status !== "lobby") throw new Error("Não podes expulsar a meio da partida");
    if (data.userId === context.userId) throw new Error("Não podes expulsar-te a ti");
    await sql`delete from room_players where room_code = ${room.code} and user_id = ${data.userId}`;
    return { ok: true };
  });

export const addBot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room || room.host_id !== context.userId) throw new Error("Só o anfitrião adiciona jogadores virtuais");
    if (room.status !== "lobby") throw new Error("A partida já começou");
    const current = await sql<{ user_id: string }>`select user_id from room_players where room_code = ${room.code}`;
    if (current.length >= room.max_players) throw new Error("Sala cheia");
    const taken = new Set(current.map((r) => r.user_id));
    const bot = BOTS.find((b) => !taken.has(b.id));
    if (!bot) throw new Error("Não há mais jogadores virtuais disponíveis");
    await sql`insert into room_players (room_code, user_id, is_bot) values (${room.code}, ${bot.id}, true)`;
    return { ok: true, name: bot.displayName };
  });

export const startMatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room || room.host_id !== context.userId) throw new Error("Só o anfitrião começa a partida");
    if (room.status !== "lobby") throw new Error("A partida já começou");
    const cats = asJson<CategoryDef[]>(room.categories, []);
    const letters = asJson<string[]>(room.letters, []);
    if (cats.length < MIN_CATEGORIES) throw new Error("Mínimo de 8 categorias");
    if (letters.length < 1) throw new Error("Escolhe pelo menos uma letra");
    const n = await sql<{ n: number }>`select count(*)::int as n from room_players where room_code = ${room.code}`;
    if ((n[0]?.n ?? 0) < 2) throw new Error("Precisas de pelo menos 2 jogadores");
    await startRoundAt(sql, room, 1);
    return { ok: true };
  });

export const saveAnswers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string; answers: Record<string, string> }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room) throw new Error("Sala inexistente");
    if (room.status !== "playing") throw new Error("A ronda já fechou");
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.answers)) clean[k] = String(v).slice(0, 64);
    await sql.query(
      `insert into round_answers (room_code, round, user_id, answers, locked)
       values ($1,$2,$3,$4::jsonb,false)
       on conflict (room_code, round, user_id)
       do update set answers = excluded.answers, updated_at = now()
       where round_answers.locked = false`,
      [room.code, room.current_round, context.userId, JSON.stringify(clean)],
    );
    return { ok: true };
  });

export const pressStop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room) throw new Error("Sala inexistente");
    if (room.status !== "playing") return { ok: true };
    const member = await sql<{ user_id: string }>`
      select user_id from room_players where room_code = ${room.code} and user_id = ${context.userId}`;
    if (!member[0]) throw new Error("Não estás nesta sala");
    await finalizeRound(sql, room, context.userId, "manual");
    return { ok: true };
  });

export const getRoomState = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    return assembleState(sql, context.userId, data.code.trim().toUpperCase());
  });

export const voteAnswer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string; categoryId: string; answerUserId: string; accept: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room || room.status !== "verifying") throw new Error("Não há votação aberta");
    await sql.query(
      `insert into answer_votes (room_code, round, category_id, answer_user_id, voter_id, accept)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (room_code, round, category_id, answer_user_id, voter_id)
       do update set accept = excluded.accept`,
      [room.code, room.current_round, data.categoryId, data.answerUserId, context.userId, data.accept],
    );
    return { ok: true };
  });

export const closeVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room) throw new Error("Sala inexistente");
    if (room.host_id !== context.userId) throw new Error("Só o anfitrião fecha a verificação");
    if (room.status !== "verifying") return { ok: true };
    const result = await sql<{ items: unknown }>`
      select items from round_results where room_code = ${room.code} and round = ${room.current_round}`;
    const votes = await sql<{ category_id: string; answer_user_id: string; accept: boolean }>`
      select category_id, answer_user_id, accept from answer_votes
      where room_code = ${room.code} and round = ${room.current_round}`;
    const answers = await sql<{ user_id: string; answers: unknown }>`
      select user_id, answers from round_answers where room_code = ${room.code} and round = ${room.current_round}`;
    const byUser: Record<string, Record<string, string>> = {};
    for (const a of answers) byUser[a.user_id] = asJson(a.answers, {});
    let verdicts = asJson<RawVerdict[]>(result[0]?.items, []);
    verdicts = verdicts.map((v) => {
      if (!v.needsVote) return v;
      return { ...v, needsVote: false, status: v.status === "vote" ? "valid" : v.status, reason: v.reason + "+timeout" };
    });
    verdicts = applyVotes(
      verdicts,
      votes.map((v) => ({ categoryId: v.category_id, answerUserId: v.answer_user_id, accept: v.accept })),
      byUser,
      room.duplicate_points === 0 ? 0 : 5,
    );
    await persistResults(sql, room, room.stop_by ?? "auto", room.stop_kind ?? "auto", verdicts, true);
    return { ok: true };
  });

export const nextRound = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { code: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.code.toUpperCase());
    if (!room || room.host_id !== context.userId) throw new Error("Só o anfitrião avança");
    if (room.status !== "results") throw new Error("A ronda ainda não acabou");
    if (room.current_round >= room.total_rounds) {
      await finishMatch(sql, room);
      return { done: true };
    }
    await startRoundAt(sql, room, room.current_round + 1);
    return { done: false };
  });

export const listNearby = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    const rows = await sql<{
      user_id: string;
      username: string;
      display_name: string;
      avatar_id: string;
      last_seen: unknown;
    }>`
      select user_id, username, display_name, avatar_id, last_seen
      from profiles
      where looking = true
        and user_id <> ${context.userId}
        and last_seen > now() - interval '90 seconds'
      order by last_seen desc
      limit 40`;
    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarId: r.avatar_id,
      lastSeen: iso(r.last_seen),
    }));
  });

export const invitePlayer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomCode: string; toId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const room = await loadRoom(sql, data.roomCode.toUpperCase());
    if (!room) throw new Error("Sala inexistente");
    const id = nid("i_");
    await sql`insert into room_invites (id, room_code, from_id, to_id) values (${id}, ${room.code}, ${context.userId}, ${data.toId})`;
    return { id };
  });

export const respondInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; accept: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; room_code: string; to_id: string }>`
      select id, room_code, to_id from room_invites where id = ${data.id}`;
    const inv = rows[0];
    if (!inv || inv.to_id !== context.userId) throw new Error("Convite inválido");
    await sql`update room_invites set status = ${data.accept ? "accepted" : "declined"} where id = ${inv.id}`;
    if (!data.accept) return { code: null };
    const room = await loadRoom(sql, inv.room_code);
    if (!room) throw new Error("Sala inexistente");
    const already = await sql<{ user_id: string }>`
      select user_id from room_players where room_code = ${room.code} and user_id = ${context.userId}`;
    if (!already[0]) {
      if (room.status !== "lobby") throw new Error("Esta partida já começou");
      const count = await sql<{ n: number }>`select count(*)::int as n from room_players where room_code = ${room.code}`;
      if ((count[0]?.n ?? 0) >= room.max_players) throw new Error("Sala cheia");
      await sql`insert into room_players (room_code, user_id, is_host) values (${room.code}, ${context.userId}, false)`;
    }
    return { code: room.code };
  });

export const myInvites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      room_code: string;
      from_id: string;
      status: string;
      created_at: unknown;
      display_name: string | null;
    }>`
      select i.id, i.room_code, i.from_id, i.status, i.created_at, p.display_name
      from room_invites i
      left join profiles p on p.user_id = i.from_id
      where i.to_id = ${context.userId} and i.status = 'pending'
      order by i.created_at desc`;
    return rows.map((r) => ({
      id: r.id,
      roomCode: r.room_code,
      fromId: r.from_id,
      fromName: r.display_name ?? "Jogador",
      status: r.status,
      createdAt: iso(r.created_at) ?? "",
    }));
  });

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { q: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const q = `%${data.q.trim().toLowerCase()}%`;
    if (data.q.trim().length < 2) return [];
    const rows = await sql<{ user_id: string; username: string; display_name: string; avatar_id: string }>`
      select user_id, username, display_name, avatar_id
      from profiles
      where user_id <> ${context.userId}
        and (lower(username) like ${q} or lower(display_name) like ${q})
      order by username
      limit 20`;
    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarId: r.avatar_id,
    }));
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { toId: string }) => d)
  .handler(async ({ context, data }) => {
    if (data.toId === context.userId) throw new Error("Não podes adicionar-te a ti");
    const sql = await getSql();
    const existing = await sql<{ id: string; status: string; from_id: string }>`
      select id, status, from_id from friend_requests
      where (from_id = ${context.userId} and to_id = ${data.toId})
         or (from_id = ${data.toId} and to_id = ${context.userId})
      limit 1`;
    if (existing[0]?.status === "accepted") return { status: "accepted" };
    if (existing[0] && existing[0].from_id !== context.userId && existing[0].status === "pending") {
      await sql`update friend_requests set status = 'accepted' where id = ${existing[0].id}`;
      return { status: "accepted" };
    }
    if (existing[0]) return { status: existing[0].status };
    const id = nid("f_");
    await sql`insert into friend_requests (id, from_id, to_id, status) values (${id}, ${context.userId}, ${data.toId}, 'pending')`;
    return { status: "pending" };
  });

export const respondFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; accept: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; to_id: string }>`select id, to_id from friend_requests where id = ${data.id}`;
    if (!rows[0] || rows[0].to_id !== context.userId) throw new Error("Pedido inválido");
    await sql`update friend_requests set status = ${data.accept ? "accepted" : "declined"} where id = ${data.id}`;
    return { ok: true };
  });

export const listFriends = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      from_id: string;
      to_id: string;
      status: string;
      username: string;
      display_name: string;
      avatar_id: string;
      other_id: string;
    }>`
      select fr.id, fr.from_id, fr.to_id, fr.status,
             p.username, p.display_name, p.avatar_id,
             case when fr.from_id = ${context.userId} then fr.to_id else fr.from_id end as other_id
      from friend_requests fr
      join profiles p on p.user_id = case when fr.from_id = ${context.userId} then fr.to_id else fr.from_id end
      where (fr.from_id = ${context.userId} or fr.to_id = ${context.userId})
        and fr.status in ('pending','accepted')
      order by fr.created_at desc`;
    return {
      friends: rows.filter((r) => r.status === "accepted").map((r) => ({
        id: r.id,
        userId: r.other_id,
        username: r.username,
        displayName: r.display_name,
        avatarId: r.avatar_id,
      })),
      incoming: rows
        .filter((r) => r.status === "pending" && r.to_id === context.userId)
        .map((r) => ({
          id: r.id,
          userId: r.other_id,
          username: r.username,
          displayName: r.display_name,
          avatarId: r.avatar_id,
        })),
      outgoing: rows
        .filter((r) => r.status === "pending" && r.from_id === context.userId)
        .map((r) => ({
          id: r.id,
          userId: r.other_id,
          username: r.username,
          displayName: r.display_name,
          avatarId: r.avatar_id,
        })),
    };
  });

export const ranking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { scope: "global" | "friends" }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileRow(sql, context.userId);
    let rows: {
      user_id: string;
      username: string;
      display_name: string;
      avatar_id: string;
      wins: number;
      total_points: number;
      games_played: number;
    }[] = [];
    if (data.scope === "global") {
      rows = await sql`
        select user_id, username, display_name, avatar_id, wins, total_points, games_played
        from profiles
        where is_guest = false or games_played > 0
        order by total_points desc, wins desc
        limit 50`;
    } else {
      rows = await sql`
        select p.user_id, p.username, p.display_name, p.avatar_id, p.wins, p.total_points, p.games_played
        from profiles p
        where p.user_id = ${context.userId}
           or p.user_id in (
             select case when from_id = ${context.userId} then to_id else from_id end
             from friend_requests
             where status = 'accepted' and (from_id = ${context.userId} or to_id = ${context.userId})
           )
        order by p.total_points desc, p.wins desc
        limit 50`;
    }
    return rows.map(
      (r, i): RankRow => ({
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarId: r.avatar_id,
        wins: r.wins,
        totalPoints: r.total_points,
        gamesPlayed: r.games_played,
        position: i + 1,
      }),
    );
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      room_code: string;
      played_at: unknown;
      winner_id: string | null;
      total_rounds: number;
      players: unknown;
    }>`
      select h.id, h.room_code, h.played_at, h.winner_id, h.total_rounds, h.players
      from match_history h
      join history_players hp on hp.history_id = h.id
      where hp.user_id = ${context.userId}
      order by h.played_at desc
      limit 40`;
    return rows.map((r): HistorySummary => {
      const players = asJson<HistorySummary["players"]>(r.players, []);
      const winner = players.find((p) => p.userId === r.winner_id);
      const me = players.find((p) => p.userId === context.userId);
      return {
        id: r.id,
        roomCode: r.room_code,
        playedAt: iso(r.played_at) ?? "",
        winnerName: winner?.name ?? null,
        winnerId: r.winner_id,
        totalRounds: r.total_rounds,
        myScore: me?.score ?? 0,
        players,
      };
    });
  });

export const historyDetail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const allowed = await sql<{ history_id: string }>`
      select history_id from history_players where history_id = ${data.id} and user_id = ${context.userId}`;
    if (!allowed[0]) throw new Error("Histórico indisponível");
    const rows = await sql<{
      id: string;
      room_code: string;
      played_at: unknown;
      winner_id: string | null;
      total_rounds: number;
      players: unknown;
      rounds: unknown;
    }>`select * from match_history where id = ${data.id}`;
    const r = rows[0];
    if (!r) throw new Error("Partida não encontrada");
    return {
      id: r.id,
      roomCode: r.room_code,
      playedAt: iso(r.played_at),
      winnerId: r.winner_id,
      totalRounds: r.total_rounds,
      players: asJson(r.players, []),
      rounds: asJson(r.rounds, []),
    };
  });

export const publicLobbies = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<{
      code: string;
      host_id: string;
      max_players: number;
      display_name: string | null;
      n: number;
    }>`
      select r.code, r.host_id, r.max_players, p.display_name, count(rp.user_id)::int as n
      from rooms r
      left join profiles p on p.user_id = r.host_id
      join room_players rp on rp.room_code = r.code
      where r.status = 'lobby' and r.mode = 'public'
      group by r.code, r.host_id, r.max_players, p.display_name
      order by r.created_at desc
      limit 20`;
    return rows.map((r) => ({
      code: r.code,
      hostName: r.display_name ?? "Anfitrião",
      players: r.n,
      maxPlayers: r.max_players,
    }));
  });
