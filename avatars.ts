export const AVATARS = [
  { id: "s1", label: "Carmesim", from: "#3a0d12", to: "#e22d2d" },
  { id: "s2", label: "Carvão", from: "#16171c", to: "#8b909a" },
  { id: "s3", label: "Areia", from: "#2a241c", to: "#c4b49a" },
  { id: "s4", label: "Musgo", from: "#14201a", to: "#3f8f6b" },
  { id: "s5", label: "Oceano", from: "#101820", to: "#3d7ea6" },
  { id: "s6", label: "Ameixa", from: "#1c1218", to: "#a45d72" },
  { id: "s7", label: "Cobre", from: "#241810", to: "#c0743a" },
  { id: "s8", label: "Gelo", from: "#14181c", to: "#d5dde6" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export function avatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
