"use client";

import { FormEvent, useMemo, useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { useGenesisUI } from "@/state/useGenesisUI";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


export function ChatPane() {
  const {
    isLoading,
    isSending,
    currentSessionId,
    messagesBySession,
    selectedModelId,
    useTavily,
    sendMessage,
  } = useGenesisUI();
  const messages = useMemo(() => messagesBySession[currentSessionId] ?? [], [messagesBySession, currentSessionId]);
  const [draft, setDraft] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const lastMessageCountRef = useRef(0);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isLoading || isSending) return;
    
    // Clear the draft immediately for visual feedback
    setDraft("");
    
    // Reset scroll control when sending a message
    setUserHasScrolled(false);
    
    try {
      await sendMessage(trimmed);
    } catch (error) {
      // If there is an error, restore the draft
      setDraft(trimmed);
      console.error("Error sending message:", error);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      }
    }

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
      return () => textarea.removeEventListener("keydown", handleKeyDown);
    }
  }, [draft, isLoading, isSending]);

  // Detect any user scroll interaction
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    function handleUserScroll(event: Event) {
      const target = event.target as HTMLElement;
      if (!target) return;
      
      // Check if the user is scrolling up
      const { scrollTop, scrollHeight, clientHeight } = target;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // If not near the bottom, mark that the user has scrolled
      if (!isNearBottom) {
        setUserHasScrolled(true);
      }
    }

    // Detect scroll via mouse wheel, touch, or scroll bar
    mainElement.addEventListener('scroll', handleUserScroll, { passive: true });
    mainElement.addEventListener('wheel', handleUserScroll, { passive: true });
    mainElement.addEventListener('touchmove', handleUserScroll, { passive: true });
    
    return () => {
      mainElement.removeEventListener('scroll', handleUserScroll);
      mainElement.removeEventListener('wheel', handleUserScroll);
      mainElement.removeEventListener('touchmove', handleUserScroll);
    };
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Scroll if: the user has not scrolled manually OR there are new messages
    if (!userHasScrolled || hasNewMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userHasScrolled]);

  // Reset the control when the session changes
  useEffect(() => {
    setUserHasScrolled(false);
    lastMessageCountRef.current = 0;
  }, [currentSessionId]);

  return (
    <div className="flex h-screen flex-1 flex-col bg-obsidian/80">
      <header className="flex h-20 items-center justify-between border-b border-line px-10 text-ink">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">// Control Panel</div>
          <div className="text-2xl font-bold uppercase text-ink" style={{ fontFamily: "var(--font-condensed)" }}>
            Session {currentSessionId ? currentSessionId.slice(0, 12) : "—"}
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
          <span className="rounded-sm border border-line-strong px-3 py-1 text-ink-dim">
            Model: <span className="text-ink">{selectedModelId || "—"}</span>
          </span>
          <span className="rounded-sm border border-line-strong px-3 py-1 text-ink-dim">
            Web Search: <span className={useTavily ? "text-acid" : "text-ink-muted"}>{useTavily ? "Active" : "Inactive"}</span>
          </span>
        </div>
      </header>

      <main ref={mainRef} className="relative flex flex-1 flex-col gap-5 overflow-y-auto px-10 py-8">
        <div className="relative flex-1 space-y-4">
          {isLoading ? (
            <Card className="text-center font-mono text-xs text-ink-muted">
              <CardHeader>Loading sessions</CardHeader>
              <CardContent>Please wait while we connect to LangGraph.</CardContent>
            </Card>
          ) : messages.length === 0 ? (
            <Card className="border-dashed border-line-strong bg-transparent text-center font-mono text-xs uppercase tracking-wider text-ink-dim">
              <CardContent className="pt-4">Send a command to start the mission.</CardContent>
            </Card>
          ) : (
            messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const isThinking = message.content === "Thinking...";
              return (
                <article
                  key={message.id}
                  className={clsx(
                    "max-w-2xl rounded-md border px-5 py-4 text-sm leading-relaxed",
                    isAssistant
                      ? "border-line border-l-2 border-l-acid/70 bg-panel text-ink"
                      : "ml-auto border-line-strong bg-panel-raised text-ink",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">
                    <span className={isAssistant ? "text-acid" : "text-ink-muted"}>{isAssistant ? "Genesis Agent" : "Operator"}</span>
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {isAssistant ? (
                    isThinking ? (
                      <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                        <span className="h-2 w-2 animate-pulse bg-acid" aria-hidden />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ ...props }) => (
                              <a
                                {...props}
                                className="text-acid underline decoration-acid/40 underline-offset-4 hover:decoration-acid"
                                target="_blank"
                                rel="noreferrer"
                              />
                            ),
                            code: ({ node, className, children, ...props }) => {
                              const isInline = !className?.includes('language-');
                              return isInline ? (
                                <code
                                  className={clsx(
                                    "rounded-sm bg-obsidian px-1.5 py-0.5 font-mono text-[13px] text-acid",
                                    className,
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <pre
                                  className="overflow-x-auto rounded-sm border border-line bg-obsidian p-4 font-mono text-[13px] text-ink"
                                >
                                  <code className={className} {...props}>{children}</code>
                                </pre>
                              );
                            },
                            li: ({ ...props }) => <li className="pl-1" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px] text-ink" style={{ fontFamily: "var(--font-sans)" }}>
                      {message.content}
                    </p>
                  )}
                <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">
                  {message.modelId ? <span>Model: {message.modelId}</span> : null}
                  {message.usedTavily ? <span>Web Search Enabled</span> : null}
                </div>
              </article>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-line bg-panel/60 px-10 py-5">
        <form onSubmit={handleSubmit} className="flex w-full items-start gap-4">
          <div className="flex-1">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">
              &gt; Command Input
            </label>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={isLoading ? "Loading..." : "Describe the next step of the mission"}
              className="h-[90px] w-full resize-none rounded-sm border border-line-strong bg-obsidian px-4 py-3 font-mono text-sm text-ink caret-acid placeholder:text-ink-dim focus:border-acid/60 focus:outline-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-end pt-[30px]">
            <Button
              type="submit"
              disabled={isLoading || isSending || !draft.trim()}
              className="h-[80px] px-6 text-sm tracking-[0.3em]"
            >
              Send
            </Button>
          </div>
        </form>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-dim">
          Current session: <span className="text-ink-muted">{currentSessionId || "—"}</span>
        </div>
      </footer>
    </div>
  );
}
