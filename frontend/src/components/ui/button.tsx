import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-sm font-mono font-medium uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-acid focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian disabled:cursor-not-allowed disabled:opacity-40";
  const variants = {
    primary: "bg-acid text-obsidian hover:bg-acid/85",
    ghost: "bg-transparent text-ink hover:bg-panel-raised",
    outline: "border border-line-strong text-ink hover:border-acid/60 hover:text-acid",
  } as const;
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
  } as const;

  return <button className={clsx(base, variants[variant], sizes[size], className)} {...props} />;
}
