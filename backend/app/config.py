import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from a local .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
DB_DIR = DATA_DIR / "db"

# Create directories if they do not exist
DATA_DIR.mkdir(exist_ok=True, parents=True)
REPORTS_DIR.mkdir(exist_ok=True, parents=True)
DB_DIR.mkdir(exist_ok=True, parents=True)

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# App settings
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

# Database Path
SQLITE_DB_PATH = DB_DIR / "knowledge_base.db"

def get_settings():
    return {
        "OPENAI_API_KEY": OPENAI_API_KEY,
        "GEMINI_API_KEY": GEMINI_API_KEY,
        "TAVILY_API_KEY": TAVILY_API_KEY,
        "REPORTS_DIR": str(REPORTS_DIR),
        "SQLITE_DB_PATH": str(SQLITE_DB_PATH),
    }
