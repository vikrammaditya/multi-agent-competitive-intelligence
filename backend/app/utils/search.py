import os
import requests
from duckduckgo_search import DDGS
from app.config import TAVILY_API_KEY

def search_web(query: str, max_results: int = 5) -> list[dict]:
    """
    Search the web for a query using Tavily API (primary if key is set) 
    or falling back to DuckDuckGo (free out-of-the-box).
    """
    # 1. Attempt Tavily if key is provided
    if TAVILY_API_KEY and TAVILY_API_KEY.strip():
        try:
            print(f"[Search] Attempting Tavily for query: '{query}'")
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": TAVILY_API_KEY,
                "query": query,
                "max_results": max_results,
                "include_answer": False,
                "include_raw_content": False
            }
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                results = response.json().get("results", [])
                formatted = []
                for r in results:
                    formatted.append({
                        "title": r.get("title", "No Title"),
                        "url": r.get("url", ""),
                        "snippet": r.get("content", "")
                    })
                if formatted:
                    print(f"[Search] Tavily successfully returned {len(formatted)} results.")
                    return formatted
            else:
                print(f"[Search] Tavily returned status {response.status_code}. Falling back to DuckDuckGo.")
        except Exception as e:
            print(f"[Search] Tavily search failed: {e}. Falling back to DuckDuckGo.")

    # 2. Fallback to DuckDuckGo Search
    print(f"[Search] Using DuckDuckGo Search for query: '{query}'")
    try:
        with DDGS() as ddgs:
            ddg_results = ddgs.text(query, max_results=max_results)
            formatted = []
            for r in ddg_results:
                formatted.append({
                    "title": r.get("title", "No Title"),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", "")
                })
            print(f"[Search] DuckDuckGo successfully returned {len(formatted)} results.")
            return formatted
    except Exception as e:
        print(f"[Search] DuckDuckGo search failed: {e}")
        # Return a robust empty list instead of crashing
        return []
