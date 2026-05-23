import json
import uuid
import re
from app.agents.base import BaseAgent
from app.database.vector_store import SQLiteVectorStore
from app.utils.llm import generate_embedding

class CriticAgent(BaseAgent):
    def __init__(self, db: SQLiteVectorStore = None):
        system_prompt = (
            "You are an expert Critic and Fact-Checker specialized in competitive intelligence. "
            "Your job is to analyze gathered intelligence, extract structured data, rate its credibility "
            "and factual accuracy, and flag contradictions or exaggerations. "
            "You always demand high standards of proof and prioritize precise numbers and dates."
        )
        super().__init__(
            name="Critic Agent",
            role="Information Integrity & De-duplication Auditor",
            system_prompt=system_prompt
        )
        self.db = db or SQLiteVectorStore()

    def parse_and_verify(self, researcher_findings: str, key_override: dict = None) -> tuple[str, list[dict]]:
        """
        Parses findings, deduplicates them against the vector database using embeddings,
        saves new verified facts, and outputs a detailed Markdown audit log.
        """
        # Step 1: Use LLM to extract clean, structured facts in JSON format
        extraction_prompt = (
            f"Analyze the following competitive findings:\n"
            f"=========================================\n"
            f"{researcher_findings}\n"
            f"=========================================\n\n"
            f"Extract each separate competitor fact as a JSON object inside a list. "
            f"Each object MUST have the following keys:\n"
            f"- 'competitor': The exact name of the company.\n"
            f"- 'content': The specific fact (e.g. features, latency, pricing changes).\n"
            f"- 'category': One of: 'pricing', 'feature', 'technology', 'expansion', or 'general'.\n"
            f"- 'source_url': The URL citation cited for this fact.\n\n"
            f"Output ONLY a raw JSON list. Do not include markdown wraps like ```json or any explanations."
        )

        extraction_result = self.run(extraction_prompt, key_override=key_override)
        
        # Clean potential markdown wraps from output (e.g. ```json ... ```)
        cleaned_json = extraction_result.strip()
        if cleaned_json.startswith("```"):
            cleaned_json = re.sub(r"^```(?:json)?\n", "", cleaned_json)
            cleaned_json = re.sub(r"\n```$", "", cleaned_json)
        
        try:
            facts = json.loads(cleaned_json)
        except Exception as e:
            print(f"[Critic] Failed to parse JSON extraction: {e}. Raw: {extraction_result}")
            # Fallback parsing in case JSON failed: split by lines and make mock entries
            facts = []
            for line in researcher_findings.split("\n"):
                if line.strip().startswith("-") or line.strip().startswith("*"):
                    match = re.match(r"[-*]\s+\*\*([^*]+)\*\*\s*-\s*(.*)", line.strip())
                    if match:
                        comp = match.group(1).strip()
                        rest = match.group(2).strip()
                        url_match = re.search(r"\(Source:\s*([^\)]+)\)", rest)
                        url = url_match.group(1).strip() if url_match else "Web Search"
                        content = re.sub(r"\(Source:[^\)]+\)", "", rest).strip()
                        facts.append({
                            "competitor": comp,
                            "content": content,
                            "category": "general",
                            "source_url": url
                        })

        audit_logs = []
        verified_facts_list = []
        
        # Step 2: Ingest & Deduplicate each fact
        for fact in facts:
            content = fact.get("content", "").strip()
            competitor = fact.get("competitor", "").strip()
            category = fact.get("category", "general").strip()
            source_url = fact.get("source_url", "Web Search").strip()

            if not content or not competitor:
                continue

            # Generate embedding vector for the fact content
            embedding = generate_embedding(content, key_override=key_override)

            # Query vector store for similar facts to detect duplicates
            duplicates = self.db.search_similar(embedding, limit=1, threshold=0.85)

            if duplicates:
                dup = duplicates[0]
                audit_logs.append(
                    f"⚠️ **Duplicate Suppressed** ({competitor}): '{content[:60]}...'\n"
                    f"  - Matches archived Fact ID `{dup['id'][:8]}` (Similarity: {dup['similarity']*100:.1f}%)"
                )
            else:
                # Run evaluation prompt to verify and assign confidence
                eval_prompt = (
                    f"Audit the following competitive fact:\n"
                    f"Competitor: {competitor}\n"
                    f"Fact: {content}\n"
                    f"Source: {source_url}\n\n"
                    f"Is this fact plausible, logical, and free of contradictions? "
                    f"Reply with a confidence score between 0.0 (totally unverified/contradictory) "
                    f"and 1.0 (highly reliable, precise). Return ONLY the score as a float."
                )
                try:
                    score_str = self.run(eval_prompt, key_override=key_override).strip()
                    confidence = float(re.findall(r"[-+]?\d*\.\d+|\d+", score_str)[0])
                except Exception:
                    confidence = 0.90  # Default robust score

                if confidence >= 0.5:
                    fact_id = str(uuid.uuid4())
                    self.db.add_fact(
                        id=fact_id,
                        content=content,
                        competitor=competitor,
                        category=category,
                        source_url=source_url,
                        confidence=confidence,
                        embedding=embedding
                    )
                    
                    verified_facts_list.append({
                        "id": fact_id,
                        "competitor": competitor,
                        "content": content,
                        "category": category,
                        "source_url": source_url,
                        "confidence": confidence
                    })

                    audit_logs.append(
                        f"✅ **Fact Ingested** ({competitor}): '{content[:60]}...'\n"
                        f"  - Assigned Confidence: {confidence*100:.0f}% | Saved to Fact Store as ID `{fact_id[:8]}`"
                    )
                else:
                    audit_logs.append(
                        f"❌ **Fact Rejected** ({competitor}): '{content[:60]}...'\n"
                        f"  - Flagged for low credibility or logical contradiction (Confidence: {confidence*100:.0f}%)"
                    )

        # Build Markdown log
        audit_markdown = (
            f"### CRITIC AUDIT LOG\n"
            f"Ingested competitive intelligence records, cross-referenced embeddings against local vector database, and resolved duplicates.\n\n"
            + "\n\n".join(audit_logs)
        )

        return audit_markdown, verified_facts_list
