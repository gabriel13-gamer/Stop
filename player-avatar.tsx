import { avatarById, initials } from "@/lib/game/avatars";
import { cn } from "@/lib/utils";

export function PlayerAvatar({
  name,
  avatarId,
  size = 44,
  className,
}: {
  name: string;
  avatarId: string;
  size?: number;
  className?: string;
}) {
  const a = avatarById(avatarId);
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display tracking-wide text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.34),
        background: `linear-gradient(160deg, ${a.from}, ${a.to})`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
