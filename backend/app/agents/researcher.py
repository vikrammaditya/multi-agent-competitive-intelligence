import json
from app.agents.base import BaseAgent
from app.utils.search import search_web

class ResearcherAgent(BaseAgent):
    def __init__(self):
        system_prompt = (
            "You are an elite Competitive Intelligence Researcher. Your role is to examine "
            "raw search results and extract precise, verifiable technical and business facts "
            "about competitors. You strictly avoid generalizations, hype, and unsubstantiated claims. "
            "Format your outputs as a clean Markdown list of findings, where each item starts with "
            "the competitor's name in bold, followed by a factual statement and the specific source URL. "
            "Example: '* **Cursor** - Integrated native terminal debugging with auto-correct in v0.42. (Source: https://example.com/blog)'"
        )
        super().__init__(
            name="Researcher Agent",
            role="Competitor & Market Research Specialist",
            system_prompt=system_prompt
        )

    def execute_research(self, niche: str, competitors: list[str], key_override: dict = None) -> tuple[str, list[dict]]:
        """
        Executes web searches for each competitor and synthesizes findings into a single raw intelligence report.
        Also returns a list of raw search results (urls and titles) for transparency.
        """
        all_search_hits = []
        raw_search_dumps = []

        for comp in competitors:
            # Formulate 2 search queries per competitor
            queries = [
                f"{comp} competitor product feature updates news 2026",
                f"{comp} pricing models services changes"
            ]
            
            for q in queries:
                hits = search_web(q, max_results=3)
                all_search_hits.extend(hits)
                for h in hits:
                    raw_search_dumps.append(
                        f"Query: {q}\nTitle: {h['title']}\nURL: {h['url']}\nSnippet: {h['snippet']}\n---"
                    )

        # Build prompt for LLM compilation
        combined_snippets = "\n".join(raw_search_dumps)
        
        prompt = (
            f"We are conducting competitive intelligence research on the market niche: '{niche}'.\n"
            f"Here are our target competitors: {', '.join(competitors)}.\n\n"
            f"Below are the raw search snippets retrieved from our web crawler:\n"
            f"==================================================\n"
            f"{combined_snippets}\n"
            f"==================================================\n\n"
            f"Please synthesize these snippets. Extract only concrete, relevant, and verifiable facts "
            f"about competitor pricing models, feature releases, technology stack, and major moves. "
            f"For each fact, you MUST include the exact source URL in parentheses (Source: <url>) from the search results. "
            f"If there is no source URL in the text, use '(Source: Web Search)'.\n"
            f"Do not write introductory or concluding remarks. Just provide the synthesized bullet points."
        )

        synthesized_facts = self.run(prompt, key_override=key_override)
        return synthesized_facts, all_search_hits
