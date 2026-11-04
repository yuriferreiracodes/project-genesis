import json
import os
from typing import Optional, Callable

from dotenv import load_dotenv
from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse
from langchain_openai import ChatOpenAI
from agent.tools import tavily_search
from langchain_core.messages import SystemMessage


load_dotenv()

DEBUG_AGENT_LOGS = os.getenv("DEBUG_AGENT_LOGS", "false").strip().lower() in {"1", "true", "yes"}
DEFAULT_OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
DEFAULT_USE_TAVILY = (
    (os.getenv("STUDIO_USE_TAVILY") or os.getenv("DEFAULT_USE_TAVILY", "false")).strip().lower()
    in {"1", "true", "yes"}
)


def dbg(*args):
    if DEBUG_AGENT_LOGS:
        try:
            print(*args, flush=True)
        except Exception:
            pass


def extract_settings_from_messages(messages) -> tuple[Optional[str], Optional[bool]]:
    """Read the last SystemMessage with JSON {"type":"settings"}."""
    model_name: Optional[str] = None
    use_tavily: Optional[bool] = None
    for msg in reversed(messages or []):
        try:
            if getattr(msg, "type", None) != "system":
                continue
            content = getattr(msg, "content", None)
            if not isinstance(content, str):
                continue
            data = json.loads(content)
            if isinstance(data, dict) and data.get("type") == "settings":
                if isinstance(data.get("model"), str) and data["model"].strip():
                    model_name = data["model"].strip()
                if isinstance(data.get("use_tavily"), bool):
                    use_tavily = data["use_tavily"]
                break
        except Exception:
            continue
    return model_name, use_tavily


def strip_settings_messages(messages):
    """Remove settings messages from the flow before the LLM."""
    cleaned = []
    for msg in messages or []:
        try:
            if getattr(msg, "type", None) == "system":
                content = getattr(msg, "content", None)
                if isinstance(content, str):
                    try:
                        data = json.loads(content)
                        if isinstance(data, dict) and data.get("type") == "settings":
                            continue
                    except Exception:
                        pass
        except Exception:
            pass
        cleaned.append(msg)
    return cleaned


def resolve_settings(messages, runtime) -> tuple[Optional[str], bool]:
    """Resolve model_name and use_tavily from all sources."""
    model_name, use_tavily = extract_settings_from_messages(messages)
    
    # Resolve runtime config
    try:
        runtime_cfg = getattr(runtime, "config", None)
        if isinstance(runtime_cfg, dict):
            cfg = runtime_cfg.get("configurable", {}) or {}
            if isinstance(cfg.get("model_name"), str) and cfg["model_name"].strip():
                model_name = cfg["model_name"].strip()
            if isinstance(cfg.get("use_tavily"), bool):
                use_tavily = cfg["use_tavily"]
        ctx = getattr(runtime, "context", None)
        if isinstance(ctx, dict):
            if isinstance(ctx.get("model_name"), str) and ctx["model_name"].strip():
                model_name = ctx["model_name"].strip()
            if isinstance(ctx.get("use_tavily"), bool):
                use_tavily = ctx["use_tavily"]
    except Exception:
        pass
    
    # Determine final Tavily state - DEFAULT if not specified
    desired = DEFAULT_USE_TAVILY if use_tavily is None else use_tavily
    
    return model_name, desired


class DynamicSettingsMiddleware(AgentMiddleware):
    """Middleware to dynamically switch the model and tools."""

    def filter_tools(self, tools, desired):
        """Helper: filter tools."""
        tavily_name = getattr(tavily_search, "name", "tavily_search")
        
        # Start with all tools EXCEPT Tavily
        tools_filtered = [t for t in tools if getattr(t, "name", None) != tavily_name]
        
        # Add Tavily when desired (even if it was not originally present)
        if desired:
            tools_filtered.append(tavily_search)
        
        return tools_filtered

    def apply_settings(self, request: ModelRequest, model_name: Optional[str], desired: bool):
        """Helper: apply model and tools."""
        # Filter tools
        tools = list(getattr(request, "tools", []) or [])
        tools_filtered = self.filter_tools(tools, desired)
        
        # Clean messages
        messages = getattr(request, "messages", None) or []
        cleaned = strip_settings_messages(messages)

        # If Tavily is disabled, inject a safety instruction
        # to avoid hallucinations and make the behavior explicit to the user.
        if not desired:
            try:
                guardrail = SystemMessage(
                    content=(
                        "The search tool 'tavily_search' is disabled for this "
                        "request. Do not invent or assume search results. If the "
                        "user asks for a web search, explicitly answer that "
                        "search is disabled and ask them to enable Tavily."
                    )
                )
                cleaned = list(cleaned) + [guardrail]
            except Exception:
                pass

        # Create a new model if specified
        new_model = getattr(request, "model", None)
        try:
            if model_name:
                new_model = ChatOpenAI(
                    model=model_name,
                    temperature=0.2,
                    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                    openai_api_base=os.getenv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
                )
                dbg(f"[SETTINGS] Model: {model_name}, Tavily: {desired}")
        except Exception as e:
            dbg(f"[SETTINGS] Error applying model: {e}")

        # Update request
        request.model = new_model
        request.messages = cleaned
        request.tools = tools_filtered
        
        dbg(f"[MIDDLEWARE] Tools: {len(tools)} → {len(tools_filtered)}, Tavily: {desired}")

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse]
    ) -> ModelResponse:
        """Sync version: intercept the model call."""
        messages = getattr(request, "messages", None) or []
        runtime = getattr(request, "runtime", None)
        model_name, desired = resolve_settings(messages, runtime)
        
        self.apply_settings(request, model_name, desired)
        return handler(request)

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse]
    ) -> ModelResponse:
        """Async version: intercept the model call (same code, async handler)."""
        messages = getattr(request, "messages", None) or []
        runtime = getattr(request, "runtime", None)
        model_name, desired = resolve_settings(messages, runtime)
        
        self.apply_settings(request, model_name, desired)
        return await handler(request)

    def wrap_tool_call(self, request, handler: Callable):
        """Backup: intercept tool calls to block Tavily if disabled."""
        try:
            # Get tool name
            tool_name = None
            tool = getattr(request, "tool", None)
            if tool is not None:
                tool_name = getattr(tool, "name", None)
            
            if tool_name is None:
                tool_call = getattr(request, "tool_call", None)
                if tool_call is not None:
                    if isinstance(tool_call, dict):
                        tool_name = tool_call.get("name")
                    else:
                        tool_name = getattr(tool_call, "name", None)
            
            # Check if Tavily should be blocked
            tavily_name = getattr(tavily_search, "name", "tavily_search")
            if tool_name == tavily_name:
                # Get the desired state from any available source
                state = getattr(request, "state", None)
                messages = []
                if isinstance(state, dict):
                    messages = state.get("messages", [])
                
                _, desired = extract_settings_from_messages(messages)
                desired = DEFAULT_USE_TAVILY if desired is None else desired
                
                if not desired:
                    dbg(f"[WRAP_TOOL_CALL] Blocked Tavily call (disabled)")
                    from langchain_core.messages import ToolMessage
                    return ToolMessage(
                        content="Tavily search is disabled for this request.",
                        tool_call_id=str(getattr(request, "id", "unknown")),
                        status="error"
                    )
        except Exception as e:
            dbg(f"[WRAP_TOOL_CALL] Error while intercepting: {e}")
        
        return handler(request)

    async def awrap_tool_call(self, request, handler: Callable):
        """Async version of wrap_tool_call (same logic)."""
        try:
            tool_name = None
            tool = getattr(request, "tool", None)
            if tool is not None:
                tool_name = getattr(tool, "name", None)
            
            if tool_name is None:
                tool_call = getattr(request, "tool_call", None)
                if tool_call is not None:
                    if isinstance(tool_call, dict):
                        tool_name = tool_call.get("name")
                    else:
                        tool_name = getattr(tool_call, "name", None)
            
            tavily_name = getattr(tavily_search, "name", "tavily_search")
            if tool_name == tavily_name:
                state = getattr(request, "state", None)
                messages = []
                if isinstance(state, dict):
                    messages = state.get("messages", [])
                
                _, desired = extract_settings_from_messages(messages)
                desired = DEFAULT_USE_TAVILY if desired is None else desired
                
                if not desired:
                    dbg(f"[AWRAP_TOOL_CALL] Blocked Tavily call (disabled)")
                    from langchain_core.messages import ToolMessage
                    return ToolMessage(
                        content="Tavily search is disabled for this request.",
                        tool_call_id=str(getattr(request, "id", "unknown")),
                        status="error"
                    )
        except Exception as e:
            dbg(f"[AWRAP_TOOL_CALL] Error while intercepting: {e}")
        
        return await handler(request)
