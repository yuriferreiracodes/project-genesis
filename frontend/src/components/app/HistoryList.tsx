"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGenesisUI } from "@/state/useGenesisUI";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function HistoryList() {
  const router = useRouter();
  const { isLoading, sessions, messagesBySession, selectSession } = useGenesisUI();

  const items = useMemo(
    () =>
      sessions.map((session) => ({
        ...session,
        messageCount: messagesBySession[session.id]?.length ?? 0,
        lastMessage: messagesBySession[session.id]?.slice(-1)[0]?.content ?? "",
      })),
    [sessions, messagesBySession],
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-obsidian/80 px-10 py-12 text-ink">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">// Operations Log</div>
        <h1
          className="text-3xl font-bold uppercase text-ink"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Recent Threads
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Volatile history — it resets on every development session. Reopen a thread to continue the mission from where you stopped.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Card className="font-mono text-xs text-ink-muted">
            <CardHeader>Loading history…</CardHeader>
            <CardContent>Please wait while we load the records from LangGraph.</CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              className="group cursor-pointer border-l-2 transition-colors hover:border-line-strong hover:border-l-acid hover:bg-panel-raised"
              onClick={() => {
                selectSession(item.id)
                  .catch(console.error)
                  .finally(() => router.push("/"));
              }}
            >
              <CardHeader>
                <div
                  className="text-xl font-semibold uppercase text-ink transition-colors group-hover:text-acid"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {item.title}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-muted">
                <div className="line-clamp-4 text-ink/90">
                  {item.lastMessage || "No messages yet."}
                </div>
                <div className="space-y-1 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">
                  <div>{item.messageCount} messages</div>
                  <div>{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {items.length === 0 && !isLoading ? (
        <div className="mt-12 rounded-md border border-dashed border-line-strong p-12 text-center font-mono text-xs uppercase tracking-wider text-ink-dim">
          Threads will appear here as you interact with the agent.
        </div>
      ) : null}
    </div>
  );
}
