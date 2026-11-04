import type { GenesisMessage, GenesisSession } from "@/state/useGenesisUI";

export const mockSessions: GenesisSession[] = [
  {
    id: "thread-briefing",
    title: "Initial Briefing",
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
  },
  {
    id: "thread-scout",
    title: "Tavily Search",
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  },
];

export const mockMessages: Record<string, GenesisMessage[]> = {
  "thread-briefing": [
    {
      id: "m1",
      role: "user",
      content: "I need the status of the sales pipeline.",
      timestamp: Date.now() - 1000 * 60 * 60 * 18,
      modelId: "openrouter/gpt-4.1-mini",
    },
    {
      id: "m2",
      role: "assistant",
      content: "Overall status: 12 opportunities in progress. Do you want details by region or stage?",
      timestamp: Date.now() - 1000 * 60 * 60 * 18 + 30 * 1000,
      modelId: "openrouter/gpt-4.1-mini",
    },
  ],
  "thread-scout": [
    {
      id: "m3",
      role: "user",
      content: "List recent insights about generative AI applied to retail.",
      timestamp: Date.now() - 1000 * 60 * 60 * 6,
      modelId: "openrouter/meta-llama/llama-3.1-70b-instruct",
    },
    {
      id: "m4",
      role: "assistant",
      content: "I searched with Tavily and found three relevant reports. Do you want a comparison summary?",
      timestamp: Date.now() - 1000 * 60 * 60 * 6 + 45 * 1000,
      modelId: "openrouter/meta-llama/llama-3.1-70b-instruct",
      usedTavily: true,
    },
  ],
};
