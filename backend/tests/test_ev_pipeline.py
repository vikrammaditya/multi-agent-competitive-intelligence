import asyncio
import sys
import warnings
from pathlib import Path

warnings.simplefilter("ignore", category=RuntimeWarning)
warnings.simplefilter("ignore", category=FutureWarning)

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database.vector_store import SQLiteVectorStore
from app.agents.orchestrator import AgentOrchestrator


async def main():
    print("=" * 60)
    print("   EV Vehicles Pipeline Verification")
    print("=" * 60)

    # 1. Clear DB
    db = SQLiteVectorStore()
    db.clear_database()
    print(f"\n[Setup] DB cleared. Facts count: {len(db.get_all_facts())}")

    # 2. Run pipeline in simulation mode (empty key_override)
    queue = asyncio.Queue()
    orch = AgentOrchestrator()

    niche = "EV Vehicles"
    competitors = ["Tesla", "BMW Group", "Hyundai & Kia", "Ola Electric"]

    print(f"\n[Test] Running pipeline for niche='{niche}', competitors={competitors}")
    print("-" * 60)

    pipeline_task = asyncio.create_task(
        orch.run_pipeline(
            niche=niche,
            competitors=competitors,
            queue=queue,
            key_override={}  # Force simulation mode
        )
    )

    report_md = None
    while True:
        item = await queue.get()
        if item is None:
            break

        agent = item["agent"]
        status = item["status"]
        message = item["message"]
        print(f"  [{agent.upper():12s}] {status:10s} | {message}")

        if agent == "writer" and status == "completed":
            report_md = item["data"].get("report_markdown", "")

    await pipeline_task

    # 3. Validate report content
    print("\n" + "=" * 60)
    print("   VALIDATION")
    print("=" * 60)

    if not report_md:
        print("FAIL: No report generated!")
        sys.exit(1)

    # Check for WRONG software template text
    bad_phrases = [
        "version 3.5 of their software",
        "Python runtimes to Rust-based",
        "enterprise tier pricing, moving from standard host billing",
        "database connectors",
        "low-latency similarity indexing",
    ]
    found_bad = []
    for phrase in bad_phrases:
        if phrase.lower() in report_md.lower():
            found_bad.append(phrase)

    # Check for CORRECT EV-specific text
    good_phrases = [
        "Full Self-Driving",
        "Neue Klasse",
        "E-GMP",
        "Ola Electric",
        "Supercharger",
        "cylindrical battery",
        "800V",
        "gigafactory",
    ]
    found_good = []
    for phrase in good_phrases:
        if phrase.lower() in report_md.lower():
            found_good.append(phrase)

    print(f"\n  Correct EV phrases found: {len(found_good)}/{len(good_phrases)}")
    for p in found_good:
        print(f"    ✅ '{p}'")
    missing_good = [p for p in good_phrases if p not in found_good]
    for p in missing_good:
        print(f"    ❌ MISSING '{p}'")

    print(f"\n  Bad software phrases found: {len(found_bad)}/{len(bad_phrases)}")
    for p in found_bad:
        print(f"    ⚠️  CONTAMINATION: '{p}'")
    if not found_bad:
        print(f"    ✅ No software template contamination detected")

    # Print report preview
    print("\n" + "-" * 60)
    print("--- REPORT PREVIEW (first 2000 chars) ---")
    print("-" * 60)
    print(report_md[:2000])

    # Final verdict
    print("\n" + "=" * 60)
    if found_bad:
        print("VERDICT: ❌ FAIL — Software template contamination detected")
        sys.exit(1)
    elif len(found_good) >= 5:
        print("VERDICT: ✅ PASS — Correct EV-specific content generated")
        sys.exit(0)
    else:
        print(f"VERDICT: ⚠️  PARTIAL — Only {len(found_good)} of {len(good_phrases)} EV phrases found")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
