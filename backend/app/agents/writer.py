import json
from app.agents.base import BaseAgent

class WriterAgent(BaseAgent):
    def __init__(self):
        system_prompt = (
            "You are a world-class Business Analyst and Technical Writer. Your role is "
            "to synthesize structured competitor facts into extremely clean, premium, and "
            "authoritative Markdown reports. You excel at translating technical competitor feature "
            "details into strategic commercial threats, business value maps, and tactical product recommendations."
        )
        super().__init__(
            name="Writer Agent",
            role="Lead Business & Technical Intelligence Writer",
            system_prompt=system_prompt
        )

    def generate_report(self, niche: str, competitors: list[str], verified_facts: list[dict], key_override: dict = None) -> str:
        """
        Synthesizes the verified facts sheet into a premium-grade competitive intelligence report.
        """
        # Format the facts for the LLM
        facts_text = []
        for i, f in enumerate(verified_facts):
            facts_text.append(
                f"{i+1}. [{f['competitor'].upper()} - {f['category'].upper()}] {f['content']}\n"
                f"   Confidence: {f['confidence']*100:.0f}% | Citation: {f['source_url']}"
            )
        combined_facts = "\n".join(facts_text)

        prompt = (
            f"Please write a comprehensive, professional Competitive Intelligence Report "
            f"for the market niche: '{niche}'.\n"
            f"Target Competitors: {', '.join(competitors)}.\n\n"
            f"Below is our verified fact sheet curated by the Researcher and Critic Agents:\n"
            f"==================================================\n"
            f"{combined_facts}\n"
            f"==================================================\n\n"
            f"Structure the report strictly as follows:\n\n"
            f"# Competitive Intelligence Executive Briefing: [Niche Name]\n\n"
            f"## 1. Executive Summary\n"
            f"Provide a 2-paragraph synthesis of major competitor trends, shifts in product velocity, and pricing models.\n\n"
            f"## 2. In-Depth Competitor Profiles\n"
            f"Create a deep-dive section for each competitor detailing their feature changes and pricing shifts "
            f"using the verified facts. Do not write generic profiles; keep them grounded in the facts. Include a simple comparison table where appropriate.\n\n"
            f"## 3. Technical Feature to Business Value Mapping\n"
            f"Critical Section: Map each technical competitor move to its direct business value and commercial threat.\n"
            f"Use a clean Markdown table with headers: | Competitor | Technical Move | Direct Commercial Threat | Strategic Value / Our Response |\n\n"
            f"## 4. Tactical Operational Recommendations\n"
            f"Provide 3-5 concrete, actionable tactical recommendations for our own product development, marketing, and pricing strategies "
            f"to stay ahead of these competitors.\n\n"
            f"Requirements:\n"
            f"- Make the tone authoritative, objective, and executive-level.\n"
            f"- Do not use placeholders. Provide complete text.\n"
            f"- Strictly respect the facts; do not invent new facts that are not represented in the fact sheet.\n"
            f"- Include citations/URLs next to competitor actions where possible."
        )

        return self.run(prompt, key_override=key_override)
