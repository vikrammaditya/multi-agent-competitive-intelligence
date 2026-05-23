import os
import json
import asyncio
import warnings

# Suppress deprecation and rename warnings globally
warnings.simplefilter("ignore", category=RuntimeWarning)
warnings.simplefilter("ignore", category=FutureWarning)

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pathlib import Path
from datetime import datetime

from app.config import REPORTS_DIR, DATA_DIR, get_settings
from app.database.vector_store import SQLiteVectorStore
from app.agents.orchestrator import AgentOrchestrator
from app.utils.llm import generate_embedding

app = FastAPI(
    title="Multi-Agent Competitive Intelligence Engine API",
    description="Backend API for orchestrating intelligence gathering, deduplication, and markdown report compiling.",
    version="1.0.0"
)

# Enable CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persist settings in a JSON file inside data dir
SETTINGS_FILE = DATA_DIR / "settings.json"

def load_saved_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_settings_to_file(settings: dict):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)

# Initialize database
db = SQLiteVectorStore()
orchestrator = AgentOrchestrator()

# Request schemas
class AnalyzeRequest(BaseModel):
    niche: str = Field(..., description="Target market or industry niche to analyze")
    competitors: list[str] = Field(..., min_items=1, description="List of competitor names")

class SettingsModel(BaseModel):
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    TAVILY_API_KEY: str = ""

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/analyze")
async def start_analysis(request: AnalyzeRequest):
    """
    Kicks off the competitive analysis process.
    Streams real-time updates from the agents via Server-Sent Events (SSE).
    """
    saved_keys = load_saved_settings()
    
    # Create an async queue for agent notifications
    queue = asyncio.Queue()
    
    # Run the orchestrator in the background, pumping events to the queue
    asyncio.create_task(
        orchestrator.run_pipeline(
            niche=request.niche,
            competitors=request.competitors,
            queue=queue,
            key_override=saved_keys
        )
    )

    async def event_generator():
        while True:
            item = await queue.get()
            if item is None:
                # Finished signal received from the orchestrator
                break
            
            # Format according to SSE standard
            yield f"data: {json.dumps(item)}\n\n"
            # Yield control back to the event loop
            await asyncio.sleep(0.01)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/reports")
def list_reports():
    """Lists all archived competitive intelligence reports."""
    reports = []
    for filepath in REPORTS_DIR.glob("*.md"):
        stats = filepath.stat()
        created_time = datetime.fromtimestamp(stats.st_ctime).isoformat()
        
        # Parse pretty name from filename e.g. report_AI_Coding_20260523_120000.md -> AI Coding
        parts = filepath.stem.split("_")
        pretty_name = "Competitive Intelligence Briefing"
        if len(parts) >= 2:
            pretty_name = f"Competitive Intelligence Briefing: {' '.join(parts[1:-2]) or parts[1]}"
            
        reports.append({
            "id": filepath.name,
            "title": pretty_name,
            "created_at": created_time,
            "size_bytes": stats.st_size
        })
    # Sort by creation time descending
    reports.sort(key=lambda x: x["created_at"], reverse=True)
    return reports

@app.get("/api/reports/{id}")
def get_report_content(id: str):
    """Retrieves the Markdown content of a specific report."""
    filepath = REPORTS_DIR / id
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return {"id": id, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read report: {str(e)}")

@app.delete("/api/reports/{id}")
def delete_report(id: str):
    """Deletes a report from disk."""
    filepath = REPORTS_DIR / id
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        filepath.unlink()
        return {"status": "success", "message": f"Report '{id}' deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")

@app.get("/api/facts")
def list_facts():
    """Lists all competitive intelligence facts ingested in the SQLite database."""
    return db.get_all_facts()

@app.delete("/api/facts")
def clear_facts():
    """Clears all facts from the SQLite database."""
    db.clear_database()
    return {"status": "success", "message": "Vector store cleared."}

@app.get("/api/facts/search")
def search_facts(query: str, limit: int = 5):
    """Performs a semantic vector search over the fact database."""
    if not query.strip():
        return []
    
    saved_keys = load_saved_settings()
    try:
        # Embed the search query
        query_embedding = generate_embedding(query, key_override=saved_keys)
        # Search similar facts
        hits = db.search_similar(query_embedding, limit=limit, threshold=0.1)
        return hits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Semantic search failed: {str(e)}")

@app.get("/api/settings")
def get_current_settings():
    """Gets currently stored API keys."""
    saved = load_saved_settings()
    # Mask keys for security
    masked = {}
    for k in ["GEMINI_API_KEY", "OPENAI_API_KEY", "TAVILY_API_KEY"]:
        val = saved.get(k, os.getenv(k, ""))
        if val:
            masked[k] = val[:4] + "*" * (len(val) - 8) + val[-4:] if len(val) > 8 else "****"
        else:
            masked[k] = ""
    return masked

@app.post("/api/settings")
def update_settings(settings: SettingsModel):
    """Updates and persists API keys in the backend configurations."""
    current = load_saved_settings()
    
    # Only update keys that aren't masked place-holders or empty
    updated = {}
    for k, v in settings.model_dump().items():
        if v and not v.startswith("****") and "*" not in v:
            updated[k] = v
        else:
            # Retain current key if input is masked/empty
            if k in current:
                updated[k] = current[k]
                
    save_settings_to_file(updated)
    
    # Dynamically inject into process environment variables for active libraries
    for k, v in updated.items():
        if v:
            os.environ[k] = v
            
    return {"status": "success", "message": "API configurations updated successfully."}
