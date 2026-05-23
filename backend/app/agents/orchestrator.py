import asyncio
import json
from datetime import datetime
from pathlib import Path
from app.agents.researcher import ResearcherAgent
from app.agents.critic import CriticAgent
from app.agents.writer import WriterAgent
from app.config import REPORTS_DIR

class AgentOrchestrator:
    def __init__(self):
        self.researcher = ResearcherAgent()
        self.critic = CriticAgent()
        self.writer = WriterAgent()

    async def run_pipeline(self, niche: str, competitors: list[str], queue: asyncio.Queue, key_override: dict = None):
        """
        Runs the full competitive intelligence multi-agent loop, 
        pushing real-time updates and results into the provided async queue.
        """
        try:
            # 1. Pipeline Start
            await queue.put({
                "agent": "orchestrator",
                "status": "started",
                "message": f"Starting multi-agent Competitive Intelligence pipeline for niche: '{niche}'",
                "data": {"competitors": competitors}
            })
            await asyncio.sleep(1)

            # 2. Researcher Agent Active
            await queue.put({
                "agent": "researcher",
                "status": "started",
                "message": "Orchestrating web-scraping and search queries across target competitors...",
                "data": None
            })
            
            # Execute research synchronously in thread pool to prevent event loop blocking
            loop = asyncio.get_running_loop()
            raw_findings, search_hits = await loop.run_in_executor(
                None, self.researcher.execute_research, niche, competitors, key_override
            )

            await queue.put({
                "agent": "researcher",
                "status": "progress",
                "message": f"Retrieved web crawling snippets. Extracted {len(search_hits)} source hits.",
                "data": {"search_hits": search_hits}
            })
            await asyncio.sleep(1.5)

            await queue.put({
                "agent": "researcher",
                "status": "completed",
                "message": "Synthesized raw competitive findings. Routing fact-sheet to Critic Agent.",
                "data": {"findings": raw_findings}
            })
            await asyncio.sleep(1)

            # 3. Critic Agent Active
            await queue.put({
                "agent": "critic",
                "status": "started",
                "message": "Critic Agent active. Commencing deduplication checks and credibility audit...",
                "data": None
            })
            await asyncio.sleep(1)

            # Execute critic analysis in thread pool
            audit_log, verified_facts = await loop.run_in_executor(
                None, self.critic.parse_and_verify, raw_findings, key_override
            )

            await queue.put({
                "agent": "critic",
                "status": "progress",
                "message": f"Finished audit. Ingested {len(verified_facts)} novel facts, suppressed duplicate/redundant records.",
                "data": {"audit_log": audit_log, "verified_facts": verified_facts}
            })
            await asyncio.sleep(1.5)

            if not verified_facts:
                # Edge case: No facts found or all were duplicates
                await queue.put({
                    "agent": "critic",
                    "status": "completed",
                    "message": "Deduplication completed. No novel facts found since the last run. Sourcing database archives to generate report.",
                    "data": None
                })
                # Fetch recent facts from DB to generate a general report
                recent_facts = self.critic.db.get_all_facts()
                # Filter facts relevant to these competitors
                verified_facts = [f for f in recent_facts if f["competitor"].lower() in [c.lower() for c in competitors]]
                if not verified_facts:
                    # Fallback to general recent facts
                    verified_facts = recent_facts[:5]
            
            await queue.put({
                "agent": "critic",
                "status": "completed",
                "message": "Facts verified and stored. Routing structured sheets to Writer Agent.",
                "data": None
            })
            await asyncio.sleep(1)

            # 4. Writer Agent Active
            await queue.put({
                "agent": "writer",
                "status": "started",
                "message": "Writer Agent active. Synthesizing briefing report, mapping technical moves to commercial threats...",
                "data": None
            })
            await asyncio.sleep(1.5)

            # Execute report generation in thread pool
            final_report = await loop.run_in_executor(
                None, self.writer.generate_report, niche, competitors, verified_facts, key_override
            )

            await queue.put({
                "agent": "writer",
                "status": "completed",
                "message": "Report compilation completed. Generating final document archive.",
                "data": {"report_markdown": final_report}
            })
            await asyncio.sleep(1)

            # 5. Archive report to disk
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_niche = "".join([c if c.isalnum() else "_" for c in niche]).strip("_")
            filename = f"report_{safe_niche}_{timestamp}.md"
            filepath = REPORTS_DIR / filename
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(final_report)

            # Save report meta info to reports index database if needed
            # For simplicity, we can load reports by reading files directly from the reports folder!

            # 6. Pipeline Complete
            await queue.put({
                "agent": "orchestrator",
                "status": "completed",
                "message": "Competitive Intelligence pipeline execution successful. Report archived.",
                "data": {
                    "filename": filename,
                    "filepath": str(filepath),
                    "report_markdown": final_report
                }
            })

        except Exception as e:
            print(f"[Orchestrator] Error during pipeline execution: {e}")
            await queue.put({
                "agent": "orchestrator",
                "status": "error",
                "message": f"Pipeline failed with error: {str(e)}",
                "data": None
            })
        finally:
            # Signal the queue reader that streaming is finished
            await queue.put(None)
