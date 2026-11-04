"""Simple tools used by the agent.

Contains the `tavily_search` tool for web searches.
"""

import json
import os

from dotenv import load_dotenv
from langchain.tools import tool
from langchain_tavily import TavilySearch


load_dotenv()


@tool
def tavily_search(
    query: str,
    max_results: int = 5,
    include_raw_content: bool = False,
) -> str:
    """Search the Internet with Tavily.

    Parameters:
    - query: search text.
    - max_results: maximum number of results returned.
    - include_raw_content: when True, includes the raw content of the pages.

    Returns:
    - JSON string with the results (or a simple string as fallback).
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("Set TAVILY_API_KEY to use tavily_search.")

    client = TavilySearch(
        api_key=api_key,
        max_results=max_results,
        topic="general",
        include_raw_content=include_raw_content,
    )
    result = client.invoke(input=query)
    try:
        return json.dumps(result)
    except Exception:
        return str(result)
