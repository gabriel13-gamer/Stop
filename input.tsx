import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 text-base text-fg outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-subtle focus:border-stop/50 focus:ring-2 focus:ring-stop/20",
        className,
      )}
      {...props}
    />
  );
}
