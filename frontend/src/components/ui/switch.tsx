import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface SwitchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  label?: string;
}

export function Switch({ checked, label, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={clsx("flex items-center gap-3", className)}
      {...props}
    >
      <span
        className={clsx(
          "relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-sm border transition-colors",
          checked ? "border-acid/70 bg-acid/15" : "border-line-strong bg-obsidian",
        )}
      >
        <span
          className={clsx(
            "inline-block h-3.5 w-3.5 transform rounded-[2px] transition-transform",
            checked ? "translate-x-[22px] bg-acid shadow-[0_0_8px_rgba(198,245,102,0.6)]" : "translate-x-[3px] bg-ink-dim",
          )}
        />
      </span>
      {label ? <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">{label}</span> : null}
    </button>
  );
}
