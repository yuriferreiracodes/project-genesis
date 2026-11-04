"""Simple agent (KISS) using LangChain 1.0.

Keeps the public functions: `tavily_search`, `create_agent_graph`, `build_graph`, `graph`.
Supports dynamic model/tool switching through SystemMessage and runtime config,
with a small and direct middleware.
"""

import os
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Iterable, List, Optional

from dotenv import load_dotenv
from langchain.agents import AgentState, create_agent
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from agent.tools import tavily_search
from agent.middleware import DynamicSettingsMiddleware


load_dotenv()

# Simple configuration through environment variables
DEBUG_AGENT_LOGS = os.getenv("DEBUG_AGENT_LOGS", "false").strip().lower() in {"1", "true", "yes"}

STUDIO_MODEL_NAME = os.getenv("STUDIO_MODEL_NAME")
STUDIO_USE_TAVILY = os.getenv("STUDIO_USE_TAVILY")

DEFAULT_MODEL_NAME = STUDIO_MODEL_NAME or os.getenv("DEFAULT_MODEL_NAME", "google/gemini-2.5-flash")
DEFAULT_USE_TAVILY = (STUDIO_USE_TAVILY or os.getenv("DEFAULT_USE_TAVILY", "false")).strip().lower() in {"1", "true", "yes"}

# Current date in the São Paulo time zone (Brazil), format DD/MM/YYYY
CURRENT_DATE_SP = datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%d/%m/%Y")

DEFAULT_SYSTEM_PROMPT = os.getenv(
    "DEFAULT_SYSTEM_PROMPT",
    (
        f"You are a copilot that helps the Project Genesis team. Today is {CURRENT_DATE_SP} (São Paulo time zone). "
        "When asked for today's date, answer directly with that date, without saying you do not have access to real-time information. "
        "If asked for the exact time, say that you only have the date. Be direct in your answers."
    ),
)

DEFAULT_OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")


def dbg(*args):
    """Print simple logs when `DEBUG_AGENT_LOGS` is enabled.

    Parameters:
    - args: values to print (they will be converted to strings).
    """
    if DEBUG_AGENT_LOGS:
        try:
            print(*args, flush=True)
        except Exception:
            pass

def create_agent_graph(
    model_name: str,
    system_prompt: str,
    use_tavily: bool = False,
    tools: Optional[Iterable[BaseTool]] = None,
    openrouter_api_key: Optional[str] = None,
    openrouter_base_url: str = DEFAULT_OPENROUTER_BASE_URL,
    temperature: float = 0.2,
):
    """Create and return a simple agent with the given model and tools.

    Concept (Factory): this function is a "factory". It receives
    parameters, builds the dependencies (model, tools, middleware)
    and returns a ready object (the agent Runnable). In other words, it does not
    run the agent; it only builds and returns a configured instance
    to be used later.

    Tip: you can pass the parameters by name (recommended for clarity)
    or by position, as you prefer.

    Parameters:
    - model_name: model name at the provider (e.g. "openai/gpt-4o-mini").
    - system_prompt: initial instructions for the agent.
    - use_tavily: when True, enables the Tavily search tool.
    - tools: other tools to add (iterable of BaseTool).
    - openrouter_api_key: OpenRouter API key (falls back to env `OPENROUTER_API_KEY`).
    - openrouter_base_url: base URL of the OpenRouter API.
    - temperature: model temperature (creativity).

    Returns:
    - Agent Runnable created by LangChain (compatible with LangGraph).
    """

    api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("Set OPENROUTER_API_KEY to initialize the agent.")

    agent_tools: List[BaseTool] = list(tools or [])
    # Only include Tavily here when explicitly requested.
    # In other cases, the middleware handles dynamic add/remove per request.
    if use_tavily:
        agent_tools.append(tavily_search)

    model = ChatOpenAI(
        model=model_name,
        temperature=temperature,
        openai_api_key=api_key,
        openai_api_base=openrouter_base_url,
    )

    dbg(f"[AGENT] model={model_name} tavily={use_tavily} tools={len(agent_tools)}")

    # Simple middleware for dynamic switching via SystemMessage and runtime config
    middlewares = [DynamicSettingsMiddleware()]

    return create_agent(
        model=model,
        tools=agent_tools,
        system_prompt=system_prompt,
        state_schema=AgentState,
        middleware=middlewares,
    )

# Object exported for langgraph.json and direct use
# Created by the factory above with default values from the environment.
graph = create_agent_graph(
    model_name=DEFAULT_MODEL_NAME,
    system_prompt=DEFAULT_SYSTEM_PROMPT,
    use_tavily=DEFAULT_USE_TAVILY,
)
