"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useGenesisUI } from "@/state/useGenesisUI";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function Sidebar() {
  const {
    isLoading,
    models,
    selectedModelId,
    setSelectedModelId,
    useTavily,
    setUseTavily,
    sessions,
    currentSessionId,
    selectSession,
    createSession,
  } = useGenesisUI();
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-80 flex-col gap-8 border-r border-line bg-panel p-7 text-ink">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">// Agent Factory</div>
          <div
            className="text-2xl font-black uppercase text-ink"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Project Genesis
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-sm border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_6px_rgba(198,245,102,0.8)]" aria-hidden />
          Local
        </span>
      </div>

      <nav className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted">
        <Link
          href="/"
          className={clsx(
            "rounded-sm border-l-2 px-3 py-2 transition-colors",
            pathname === "/" ? "border-acid bg-panel-raised text-ink" : "border-transparent hover:bg-panel-raised hover:text-ink",
          )}
        >
          Operations Console
        </Link>
        <Link
          href="/history"
          className={clsx(
            "rounded-sm border-l-2 px-3 py-2 transition-colors",
            pathname === "/history" ? "border-acid bg-panel-raised text-ink" : "border-transparent hover:bg-panel-raised hover:text-ink",
          )}
        >
          Thread History
        </Link>
      </nav>

      <section className="space-y-3">
        <header className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">Model Selection</header>
        <div className="flex flex-col gap-3">
          {models.map((model) => {
            const active = model.id === selectedModelId;
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                className={clsx(
                  "flex items-center justify-between rounded-sm border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-acid/50 bg-acid/[0.06] text-ink"
                    : "border-line bg-obsidian/60 text-ink hover:border-line-strong hover:bg-panel-raised",
                )}
              >
                <div className="flex flex-col">
                  <span
                    className="text-sm font-semibold uppercase text-ink"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {model.label}
                  </span>
                  <span className="font-mono text-[10px] text-ink-dim">
                    cost in/out ${model.inputCost.toFixed(2)} / ${model.outputCost.toFixed(2)}
                  </span>
                </div>
                <span
                  className={clsx(
                    "rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                    active ? "border-acid bg-acid text-obsidian" : "border-line-strong text-ink-dim",
                  )}
                >
                  {active ? "Active" : "Select"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <header className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">Tools</header>
        <Switch
          checked={useTavily}
          label={useTavily ? "Web Search enabled" : "Web Search disabled"}
          onClick={() => setUseTavily(!useTavily)}
        />
      </section>

      <section className="flex-1 space-y-3 overflow-hidden">
        <header className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">
          Active Sessions
          <Button
            onClick={() => createSession().catch(console.error)}
            size="sm"
            variant="outline"
            disabled={isLoading}
                      >
            New Thread
          </Button>
        </header>
        <div className="-mr-3 flex h-full flex-col gap-2 overflow-y-auto pr-3">
          {isLoading ? (
            <div className="space-y-2 rounded-sm border border-line bg-obsidian/60 p-3 font-mono text-xs text-ink-dim">
              Loading threads…
            </div>
          ) : (
            sessions.map((session) => {
              const active = session.id === currentSessionId;
              return (
                <button
                  key={session.id}
                  onClick={() => selectSession(session.id).catch(console.error)}
                  className={clsx(
                    "flex flex-col gap-1 rounded-sm border border-l-2 px-3 py-2 text-left transition-colors",
                    active
                      ? "border-line border-l-acid bg-panel-raised text-ink"
                      : "border-line bg-obsidian/60 text-ink hover:border-line-strong hover:bg-panel-raised",
                  )}
                >
                  <span
                    className="text-sm font-semibold uppercase tracking-wide text-ink"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {session.title}
                  </span>
                  <span className="truncate font-mono text-[10px] text-ink-dim">{session.id}</span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </aside>
  );
}
