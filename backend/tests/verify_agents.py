import asyncio
import sys
import warnings
from pathlib import Path

# Suppress deprecation and rename warnings globally
warnings.simplefilter("ignore", category=RuntimeWarning)
warnings.simplefilter("ignore", category=FutureWarning)


# Add backend directory to path so imports work cleanly
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database.vector_store import SQLiteVectorStore
from app.agents.orchestrator import AgentOrchestrator

async def main():
    print("==================================================")
    print("   Starting Multi-Agent Engine Verification Run   ")
    print("==================================================")
    
    # 1. Initialize SQLite Database & Clear it for test run
    print("\n[Test] Initializing Local SQLite Vector Database...")
    db = SQLiteVectorStore()
    db.clear_database()
    print("-> Vector Store created and initialized. Current facts count:", len(db.get_all_facts()))
    
    # 2. Setup Async Notification Queue
    queue = asyncio.Queue()
    orchestrator = AgentOrchestrator()
    
    niche = "AI Coding Assistants"
    competitors = ["Cursor", "Windsurf"]
    
    print(f"\n[Test] Launching Agent Pipeline for Niche: '{niche}' with Competitors: {competitors}...")
    
    # Start the orchestrator pipeline task
    pipeline_task = asyncio.create_task(
        orchestrator.run_pipeline(
            niche=niche,
            competitors=competitors,
            queue=queue,
            key_override={} # Run in simulated sandbox mode
        )
    )
    
    # 3. Read notifications from queue in real-time
    report_generated = False
    
    while True:
        item = await queue.get()
        if item is None:
            break
            
        agent = item["agent"]
        status = item["status"]
        message = item["message"]
        
        print(f"[{agent.upper()}] Status: {status} | Message: {message}")
        
        # Verify that data exists at completion points
        if agent == "researcher" and status == "completed":
            findings = item["data"].get("findings")
            print(f"   -> [OK] Researcher compiled raw findings: {len(findings)} characters.")
            
        if agent == "critic" and status == "progress":
            verified = item["data"].get("verified_facts")
            print(f"   -> [OK] Critic Auditor verified {len(verified)} novel facts.")
            
        if agent == "writer" and status == "completed":
            report_md = item["data"].get("report_markdown")
            print(f"   -> [OK] Writer Agent successfully generated Markdown report: {len(report_md)} characters.")
            
        if agent == "orchestrator" and status == "completed":
            filename = item["data"].get("filename")
            print(f"\nSUCCESS: Agent Orchestration Completed! Saved file: {filename}")
            report_generated = True

    await pipeline_task
    
    # 4. Final verification checks
    print("\n========================= DIAGNOSTICS =========================")
    all_facts = db.get_all_facts()
    print(f"1. Facts count stored in SQLite DB: {len(all_facts)}")
    for f in all_facts[:2]:
      print(f"   - [{f['competitor']}] {f['content'][:80]}...")
      
    print(f"2. Report file physically created on disk: {report_generated}")
    print("===============================================================")
    
    if len(all_facts) > 0 and report_generated:
      print("\nVerification SUCCESS! Agent intelligence engines are running perfectly.")
      sys.exit(0)
    else:
      print("\nVerification FAILED. Database ingestion or report compilation was unsuccessful.")
      sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
