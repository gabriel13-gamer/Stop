import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function slugifyUsername(input: string): string {
  const s = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 16);
  return s.length >= 3 ? s : `jog${Math.floor(100 + Math.random() * 900)}`;
}

export function firstLetter(value: string): string {
  const n = value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return (n.charAt(0) || "").toUpperCase();
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeWord(value: string): boolean {
  const n = normalizeAnswer(value);
  if (n.length < 2 || n.length > 40) return false;
  if (!/[aeiouy]/.test(n)) return false;
  if (/(.)\1{3,}/.test(n)) return false;
  if (/^[0-9]+$/.test(n)) return false;
  return true;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function levelFromPoints(points: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, points) / 40)) + 1);
}

export function winRate(wins: number, games: number): number {
  if (games <= 0) return 0;
  return Math.round((wins / games) * 100);
}
