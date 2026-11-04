"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Role = "user" | "assistant";

export interface GenesisMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  modelId?: string;
  usedTavily?: boolean;
}

interface RawMessage {
  id?: string;
  type?: string;
  content?: unknown;
  response_metadata?: {
    model_name?: string;
  };
  tool_calls?: unknown[];
  created_at?: string;
  additional_kwargs?: {
    created_at?: string;
  };
}

interface RawThread {
  thread_id: string;
  created_at?: string;
  values?: {
    messages?: RawMessage[];
  };
}

interface ModelsResponse {
  models?: Array<{
    id: string;
    label: string;
    input_cost?: number;
    output_cost?: number;
  }>;
}

function serializeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
  }
  if (content && typeof content === "object") {
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }
  return typeof content === "undefined" ? "" : String(content);
}

function normalizeMessage(message: RawMessage, index: number): GenesisMessage | null {
  if (message.type === "tool" || message.type === "function") {
    return null;
  }
  if (message.type === "system") {
    const maybeSettings = serializeContent(message.content);
    if (maybeSettings.includes('"type":"settings"')) {
      return null;
    }
  }

  const content = serializeContent(message.content);
  if (!content.trim()) {
    return null;
  }
  const role: Role = message.type === "human" ? "user" : "assistant";
  const modelId = message.response_metadata?.model_name;
  
  // Try to extract the timestamp from the message
  let timestamp = Date.now();
  if (message.created_at) {
    const parsed = Date.parse(message.created_at);
    if (!isNaN(parsed)) timestamp = parsed;
  } else if (message.additional_kwargs?.created_at) {
    const parsed = Date.parse(message.additional_kwargs.created_at);
    if (!isNaN(parsed)) timestamp = parsed;
  } else if (message.id) {
    // Try to extract the timestamp from the ID if it is a UUID v7 or contains a timestamp
    const uuidMatch = message.id.match(/^[0-9a-f]{8}-/);
    if (uuidMatch) {
      // UUID v7 has the timestamp in the first bytes, but it is complex to extract
      // Keep Date.now() as fallback
    }
  }
  
  return {
    id: message.id ?? `msg-${index}`,
    role,
    content,
    timestamp,
    modelId,
    usedTavily: Boolean(message.tool_calls && (message.tool_calls as unknown[]).length > 0),
  };
}

function normalizeThread(thread: RawThread) {
  const messages = Array.isArray(thread?.values?.messages) ? thread.values.messages : [];
  const threadCreatedAt = thread.created_at ? Date.parse(thread.created_at) : Date.now();
  
  // Normalize messages and adjust relative timestamps if needed
  const normalized = messages
    .map((m, index) => {
      const msg = normalizeMessage(m, index);
      if (!msg) return null;
      
      // If the message has no real timestamp, use an incremental timestamp based on order
      if (!m.created_at && !m.additional_kwargs?.created_at) {
        // Add 1 second per message starting from the thread creation
        msg.timestamp = threadCreatedAt + (index * 1000);
      }
      
      return msg;
    })
    .filter((msg): msg is GenesisMessage => Boolean(msg));
    
  const firstUser = normalized.find((msg) => msg.role === "user");
  const title = firstUser ? firstUser.content.slice(0, 42) : `Thread ${thread.thread_id.slice(0, 8)}`;
  const session: GenesisSession = {
    id: thread.thread_id,
    title,
    createdAt: threadCreatedAt,
  };
  return { session, messages: normalized };
}

export interface GenesisSession {
  id: string;
  title: string;
  createdAt: number;
}

export interface ModelOption {
  id: string;
  label: string;
  inputCost: number;
  outputCost: number;
}

interface GenesisUIState {
  isLoading: boolean;
  isSending: boolean;
  models: ModelOption[];
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  useTavily: boolean;
  setUseTavily: (value: boolean) => void;
  sessions: GenesisSession[];
  currentSessionId: string;
  createSession: () => Promise<string | undefined>;
  selectSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  messagesBySession: Record<string, GenesisMessage[]>;
  sendMessage: (content: string) => Promise<void>;
}

const GenesisUIContext = createContext<GenesisUIState | null>(null);

export function GenesisUIProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [useTavily, setUseTavily] = useState<boolean>(true);
  const [sessions, setSessions] = useState<GenesisSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messagesBySession, setMessagesBySession] = useState<Record<string, GenesisMessage[]>>({});

  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true);
      try {
        await Promise.all([loadModels(), loadThreads()]);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadModels() {
    const res = await fetch("/api/models", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as ModelsResponse;
    const mapped: ModelOption[] = (data.models ?? []).map((model) => ({
      id: model.id,
      label: model.label,
      inputCost: model.input_cost ?? 0,
      outputCost: model.output_cost ?? 0,
    }));
    setModels(mapped);
    if (!selectedModelId && mapped[0]) {
      setSelectedModelId(mapped[0].id);
    }
  }

  async function loadThreads() {
    const res = await fetch("/api/threads", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { threads?: RawThread[] };
    const threads = Array.isArray(data.threads) ? data.threads : [];
    const nextSessions: GenesisSession[] = [];
    const nextMessages: Record<string, GenesisMessage[]> = {};
    threads.forEach((thread) => {
      const { session, messages } = normalizeThread(thread);
      nextSessions.push(session);
      nextMessages[session.id] = messages;
    });
    setSessions(nextSessions);
    setMessagesBySession(nextMessages);
    if (!currentSessionId && nextSessions[0]) {
      setCurrentSessionId(nextSessions[0].id);
    }
  }

  const createSession = useCallback(async (): Promise<string | undefined> => {
    const res = await fetch("/api/threads", { method: "POST" });
    if (!res.ok) return;
    const data = (await res.json()) as { thread?: RawThread };
    const thread = data.thread;
    if (!thread) return;
    const { session } = normalizeThread(thread);
    setSessions((prev) => [session, ...prev]);
    setMessagesBySession((prev) => ({ ...prev, [session.id]: [] }));
    setCurrentSessionId(session.id);
    return session.id;
  }, []);

  const fetchThread = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/threads/${threadId}`);
    if (!res.ok) return;
    const data = await res.json();
    const thread = data.thread;
    if (!thread) return;
    const { messages, session } = normalizeThread(thread);
    setMessagesBySession((prev) => ({ ...prev, [threadId]: messages }));
    setSessions((prev) => {
      const exists = prev.find((s) => s.id === threadId);
      if (exists) {
        return prev.map((s) => (s.id === threadId ? { ...s, title: session.title, createdAt: session.createdAt } : s));
      }
      return [session, ...prev];
    });
  }, []);

  const selectSession = useCallback(async (id: string) => {
    setCurrentSessionId(id);
    await fetchThread(id);
  }, [fetchThread]);

  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, title } : session)));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const nextSessions = prev.filter((session) => session.id !== id);
      setCurrentSessionId((prevId) => (prevId === id ? nextSessions[0]?.id ?? "" : prevId));
      return nextSessions;
    });
    setMessagesBySession((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      let threadId = currentSessionId;
      if (!threadId) {
        const newThreadId = await createSession();
        threadId = newThreadId || currentSessionId || sessions[0]?.id || "";
      }
      if (!threadId) return;

      const optimistic: GenesisMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
        modelId: selectedModelId,
        usedTavily: useTavily,
      };

      setMessagesBySession((prev) => {
        const existing = prev[threadId] ?? [];
        return { ...prev, [threadId]: [...existing, optimistic] };
      });
      setCurrentSessionId(threadId);

      setIsSending(true);
      
      // Add a "Thinking..." message while waiting for the response
      const thinkingMessageId = `thinking-${Date.now()}`;
      const thinkingMessage: GenesisMessage = {
        id: thinkingMessageId,
        role: "assistant",
        content: "Thinking...",
        timestamp: Date.now(),
      };
      
      setMessagesBySession((prev) => {
        const existing = prev[threadId] ?? [];
        return { ...prev, [threadId]: [...existing, thinkingMessage] };
      });
      
      try {
        const res = await fetch(`/api/threads/${threadId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, model: selectedModelId, useTavily }),
        });

        if (!res.ok) {
          console.error(await res.text());
          // Remove the "Thinking..." message in case of error
          setMessagesBySession((prev) => {
            const existing = prev[threadId] ?? [];
            return { ...prev, [threadId]: existing.filter(msg => msg.id !== thinkingMessageId) };
          });
          return;
        }

        const data = (await res.json()) as { result?: { messages?: RawMessage[] } };
        const maybeMessages = data.result?.messages;
        if (!Array.isArray(maybeMessages)) return;
        const messages = maybeMessages as RawMessage[];
        const normalized = messages
          .map((m, index) => normalizeMessage(m, index))
          .filter((msg): msg is GenesisMessage => Boolean(msg));

        // Identify the new assistant message by comparing with the current state
        const currentMessages = messagesBySession[threadId] ?? [];
        const currentIds = new Set(currentMessages.map(m => m.id));
        const newAssistantMessage = normalized
          .filter((msg) => msg.role === "assistant" && !currentIds.has(msg.id))
          .pop(); // Get the last new assistant message
        
        const agentMessage = newAssistantMessage;
        if (agentMessage) {
          let typedContent = "";
          const finalContent = agentMessage.content;
          const typingMessageId = `typing-${Date.now()}`;

          const typingMessage: GenesisMessage = {
            ...agentMessage,
            id: typingMessageId,
            content: "",
          };

          // Remove "Thinking..." and add the typing message
          setMessagesBySession((prev) => {
            const existing = prev[threadId] ?? [];
            const withoutThinking = existing.filter(msg => msg.id !== thinkingMessageId);
            return { ...prev, [threadId]: [...withoutThinking, typingMessage] };
          });

          for (const char of finalContent) {
            typedContent += char;
            await new Promise((resolve) => setTimeout(resolve, 5));
            setMessagesBySession((prev) => {
              const existing = prev[threadId] ?? [];
              return {
                ...prev,
                [threadId]: existing.map((msg) =>
                  msg.id === typingMessageId ? { ...msg, content: typedContent } : msg,
                ),
              };
            });
          }
          
          // Wait for the typing effect to finish before fetching
          await fetchThread(threadId);
        }

        // Do not replace the messages here, because the fetchThread above already does it
        // setMessagesBySession((prev) => ({ ...prev, [threadId]: normalized }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsSending(false);
      }
    },
    [createSession, currentSessionId, fetchThread, selectedModelId, sessions, useTavily],
  );

  const value = useMemo<GenesisUIState>(
    () => ({
      isLoading,
      isSending,
      models,
      selectedModelId,
      setSelectedModelId,
      useTavily,
      setUseTavily,
      sessions,
      currentSessionId,
      createSession,
      selectSession,
      renameSession,
      deleteSession,
      messagesBySession,
      sendMessage,
    }),
    [
      isLoading,
      isSending,
      models,
      selectedModelId,
      useTavily,
      sessions,
      currentSessionId,
      messagesBySession,
      createSession,
      selectSession,
      renameSession,
      deleteSession,
      sendMessage,
    ],
  );

  return <GenesisUIContext.Provider value={value}>{children}</GenesisUIContext.Provider>;
}

export function useGenesisUI() {
  const context = useContext(GenesisUIContext);
  if (!context) {
    throw new Error("useGenesisUI must be used within GenesisUIProvider");
  }
  return context;
}
