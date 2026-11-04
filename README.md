# Project Genesis - Fastapp (Studio‑Only)
Local execution via LangGraph Studio + Next.js. LangChain 1.0 agent (`create_agent`), with dynamic model/Tavily and simple logs.

![Project Genesis – Local Execution (Studio + Next.js)](./sistema_local.png)
Frontend and backend running.

## Overview
- Backend (`backend/`): LangChain 1.0 agent exposed to LangGraph Studio by `backend/langgraph.json`. A custom middleware applies the dynamic model/Tavily (SystemMessage “settings” and `config.configurable`).
- Frontend (`frontend/`): Next.js 15 + React 19. Chat and history UI; it consumes the LangGraph Studio API (port 2024 by default).
- Model catalog: `models.yaml` in the root (used by the frontend in `/api/models`).

## Project Structure
- Node.js ≥ 18 (LTS recommended) – for the Next.js frontend
- npm ≥ 9 (comes with Node) – install/run the frontend
- Python ≥ 3.11 – for the agent (backend) in LangGraph
- Free LangSmith account ([langsmith.com](https://smith.langchain.com)) with an active workspace – required to authenticate LangGraph Studio
- langgraph CLI (1.0) – `langgraph dev` command
- make – convenience shortcut (macOS/Linux; on Windows use Git Bash/MSYS2/WSL)

### Backend Python dependencies
In the `backend/` directory, create a virtualenv called `.venv` and install the minimum agent dependencies listed in `requirements.txt`:

```
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### Environment variables

Create `backend/.env` with, at minimum:

```
OPENROUTER_API_KEY=...
TAVILY_API_KEY=...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEBUG_AGENT_LOGS=true

# Overrides for running in Studio (optional)
STUDIO_MODEL_NAME=google/gemini-2.5-flash
STUDIO_USE_TAVILY=true
```

> **Warning!**
>
> During development keep `STUDIO_USE_TAVILY="true"` in `backend/.env`; otherwise the frontend fails with `ValueError: Middleware returned unknown tool names:`.
>
> For the frontend, copy `frontend/.env.local.example` to `.env.local` and adjust if needed:

```
LANGGRAPH_API_BASE=http://127.0.0.1:2024
LANGGRAPH_ASSISTANT_ID=agent
```

## How to run (local with LangGraph Studio)

1) Backend (LangGraph Studio)
- Prerequisite: Python 3.11+ and the dependencies from `requirements.txt` installed
- In the `backend/` directory, activate the virtualenv and run:
  ```bash
  langgraph dev
  # Studio starts at http://127.0.0.1:2024
  ```

2) Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`.

## Makefile (shortcuts)

```
make help      # list targets
make studio    # start LangGraph Studio in ./backend
make frontend  # start Next.js in ./frontend
```

Before running, confirm that the virtualenv (`backend/.venv`) was created and filled with `pip install -r backend/requirements.txt`.

### Running manually (two terminals)

1. **Backend (LangGraph Studio)**
   ```bash
   cd backend
   source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1 on Windows
   langgraph dev
   ```

2. **Frontend (Next.js)**
   ```bash
   cd frontend
   npm run dev
   ```
   The application is available at `http://localhost:3000`.

## Notes
- This version runs locally via LangGraph Studio.
- The model and Tavily selection is sent by the frontend as a JSON SystemMessage (type "settings") and through `config.configurable`. The agent middleware applies and sanitizes it.

## Repo Notes
- The `frontend/.env.local` file is specific to the local environment and is also ignored by default.

Agent logs:

```
DEBUG_AGENT_LOGS=true    # enables detailed agent logs (agent/agent.py)
```

## Basic Workflow
1. Start LangGraph Studio in `backend/` (`make studio` or `langgraph dev`).
2. Start the frontend (`make frontend` or `npm run dev`).
3. Select the model and Tavily in the Sidebar; create a thread and send messages.
4. The frontend injects the configuration (SystemMessage “settings” and `config.configurable`); the agent middleware applies it and calls the LLM.

## Useful commands
- `npm run lint` (frontend) – validates Next/ESLint conventions.
- `npm run build` (frontend) – production build of the app.

---
