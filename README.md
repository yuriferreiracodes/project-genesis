# Project Genesis 🤖

A multi-model AI chat app. Pick a model from a list, turn web search on or off, and switch both at any time, even in the middle of a conversation. Next.js frontend + LangChain agent served by LangGraph.

```
User → Next.js (/api) → LangGraph server → agent middleware (model + tools) → OpenRouter LLM
                                                    ↓ (optional)
                                              Tavily web search
```

- **One agent, many models.** All models come from [OpenRouter](https://openrouter.ai), so one API key gives access to all of them. The list in the UI comes from `models.yaml` (id, label and example cost per 1M tokens). Add a model there and it shows up in the sidebar.
- **Settings per message.** Each message sends the chosen model and the web search flag to the backend (`config.configurable` plus a small JSON "settings" message). The middleware in `backend/agent/middleware.py` reads them, creates the model, adds or removes the search tool, and removes the settings message before the LLM call.
- **Web search (Tavily).** When it is on, the agent can call `tavily_search` (`backend/agent/tools.py`). When it is off, the tool is removed, tool calls are blocked, and the prompt tells the model not to invent search results.
- **Threads.** Conversations are LangGraph threads. The frontend lists them, opens old ones and creates new ones through its own `/api/threads` routes, so the browser never talks to LangGraph directly.
- **Keys stay on the server.** `OPENROUTER_API_KEY` and `TAVILY_API_KEY` live only in `backend/.env`.
- **Current date.** The system prompt includes today's date, so the model can answer date questions.

## Requirements

- Python 3.11+
- Node.js 18+ and npm
- An [OpenRouter](https://openrouter.ai) API key
- A [Tavily](https://tavily.com) API key (for web search)
- Docker (optional)

## Configuration

```bash
cp backend/.env.example backend/.env                 # fill in OPENROUTER_API_KEY and TAVILY_API_KEY
cp frontend/.env.local.example frontend/.env.local   # defaults work for local runs
```

| Variable | Where | What it does |
|---|---|---|
| `OPENROUTER_API_KEY` | backend | Key for all LLM calls |
| `OPENROUTER_BASE_URL` | backend | OpenRouter API URL (default `https://openrouter.ai/api/v1`) |
| `TAVILY_API_KEY` | backend | Key for web search |
| `STUDIO_MODEL_NAME` | backend | Default model when the request does not choose one |
| `STUDIO_USE_TAVILY` | backend | Default web search state. Keep it `true` in development |
| `DEBUG_AGENT_LOGS` | backend | `true` prints model and tool decisions to the console |
| `LANGGRAPH_API_BASE` | frontend | LangGraph server URL (default `http://127.0.0.1:2024`) |
| `LANGGRAPH_ASSISTANT_ID` | frontend | Graph name from `backend/langgraph.json` (default `agent`) |

## Run locally

With Docker:

```bash
docker compose up --build
# frontend http://localhost:3000   backend http://localhost:2024
```

Without Docker (two terminals):

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/langgraph dev          # http://127.0.0.1:2024

cd frontend && npm ci && npm run dev   # http://localhost:3000
```

Or use the Makefile shortcuts: `make studio` and `make frontend` (the Makefile uses zsh).

## Checks

```bash
cd frontend && npm run lint && npm run build
```

## Project structure

```
backend/
  agent/agent.py        # agent factory and exported graph
  agent/middleware.py   # applies model + web search per request
  agent/tools.py        # tavily_search tool
  langgraph.json        # exposes the graph as "agent"
frontend/
  src/app/api/          # proxy routes to LangGraph + /api/models
  src/components/       # chat, sidebar, history and UI parts
  src/state/            # app state (sessions, messages, settings)
models.yaml             # model catalog shown in the UI
```

## Notes / limits

- This is a local development setup. The backend runs `langgraph dev`, which keeps threads in memory and in local files (`backend/.langgraph_api/`). History can be lost when the server restarts.
- There is no login, no rate limit and no streaming. Each message waits for the full answer.
- The backend accepts any model id the client sends. It does not check it against `models.yaml`.
- Costs in `models.yaml` are only examples. Check current prices on OpenRouter.
- There are no automated tests yet.

## License

See [LICENSE](./LICENSE).
