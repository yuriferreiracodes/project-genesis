import clsx from "clsx";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        variant === "default"
          ? "bg-panel-raised text-ink"
          : "border border-line-strong text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
