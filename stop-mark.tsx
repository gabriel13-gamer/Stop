import { cn } from "@/lib/utils";

export function StopMark({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#0C0D10" />
      <path
        fill="#E22D2D"
        d="M16 3.4 24.4 6.9 28.6 16 24.4 25.1 16 28.6 7.6 25.1 3.4 16 7.6 6.9Z"
      />
      <path
        fill="#F3F1ED"
        d="M11.2 12.1c0-2.1 2.1-3.4 4.9-3.4 2.9 0 4.8 1.4 4.8 3.4 0 1.7-1.1 2.6-3.6 3.4l-2.1.7c-1.1.4-1.5.9-1.5 1.7 0 1.1 1.1 1.8 2.9 1.8 2.1 0 3.1-.9 3.3-2.3h2.1c-.3 2.5-2.4 4.1-5.4 4.1-3 0-5-1.7-5-3.9 0-1.8 1.1-2.8 3.6-3.6l2.1-.7c1.2-.4 1.6-.9 1.6-1.5 0-1-.9-1.6-2.6-1.6-1.7 0-2.7.6-2.8 1.9h-2.3z"
      />
    </svg>
  );
}
