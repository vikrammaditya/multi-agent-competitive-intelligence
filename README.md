# 🚀 Multi-Agent Competitive Intelligence & Content Engine

An advanced, premium-tier AI intelligence system that deploys a collaborative multi-agent team (**Researcher**, **Critic / Fact-Checker**, and **Writer**) to monitor market niches, crawl competitor updates, verify findings against a persistent local vector database using semantic cosine-similarity, and compile executive-ready briefings translating technical feature shifts into strategic business value.

Features a responsive, **glassmorphism dark-space React dashboard** displaying a real-time animated SVG agent graph, streaming console logs, semantic vector searches, settings configuration, and an interactive markdown briefing viewer.

---

## 🏗️ Core Architecture & Data Flow

```mermaid
graph TD
    User([User Form]) -->|1. Submit Niche & Competitors| Orchestrator[Agent Orchestrator]
    
    subgraph Multi-Agent Event Loop (SSE Streaming)
        Orchestrator -->|2. Delegate Task| Researcher[Researcher Agent]
        Researcher -->|3. Web Search / Scrape| SearchTool[Search Utils (Tavily / DuckDuckGo)]
        SearchTool -->|4. Raw Snippets| Researcher
        Researcher -->|5. Draft Bullet Findings| Critic[Critic / Fact-Checker Agent]
        
        Critic -->|6. Query Embeddings| VectorStore[(SQLite Vector Store)]
        VectorStore -->|7. Deduplicate & Verify| Critic
        Critic -->|8. Save Verified Facts| VectorStore
        Critic -->|9. Verified Fact Sheet| Writer[Writer Agent]
        
        Writer -->|10. Technical-to-Value Mapping| Writer
        Writer -->|11. Compile Markdown Briefing| Orchestrator
    end
    
    Orchestrator -->|12. Real-Time SSE Stream| Frontend[React Dashboard]
    Frontend -->|Query Facts| VectorStore
    Frontend -->|View / Export Reports| ReportsFolder[(Reports Archive)]
```

### 🤖 The Agent Team

1.  **Researcher Agent (Crawl Specialist)**: Formulates precise search queries regarding target competitors, triggers Tavily or free DuckDuckGo Search, crawls raw web snippets, and parses them into consolidated raw intelligence briefs.
2.  **Critic / Fact-Checker Agent (Integrity Auditor)**: Computes dense vector embeddings of scraped facts, performs a high-speed cosine-similarity query against our local database to block redundant/duplicate records, audits credibility, and saves new verified facts with metadata.
3.  **Writer Agent (Briefing Compiler)**: Synthesizes novel fact sheets into professional, executive briefings, compiling structured markdown tables that translate competitor technical shifts directly into commercial threats and product recommendations.

---

## 🛠️ Technology Stack

### Backend (Python FastAPI)
*   **Framework**: FastAPI & Uvicorn (High-performance async server hosting Server-Sent Events (SSE) streaming).
*   **Vector Database**: Custom local Vector Database implemented via **SQLite** and **NumPy** for native compatibility. Bypasses Windows C++ binary build compilation traps typical of FAISS/ChromaDB.
*   **LLM Core**: Dual-provider client supporting **Google Gemini API** (using `google-generativeai`) and **OpenAI API**, with a self-contained **simulation fallback engine** for zero-setup sandboxes.
*   **Embedding Engines**: High-performance local text projection vectorizers combined with OpenAI and Gemini embedding endpoints.
*   **Search Providers**: Tavily Search API with DuckDuckGo Search fail-safes.

### Frontend (Vite + React)
*   **Framework**: React 18, scaffolded on Vite.
*   **Design System**: Custom CSS variables, glassmorphic filters (`backdrop-filter: blur(12px)`), glow-border panels, and floating animations.
*   **Agent Visualizer**: Dynamic SVG graph charting agent nodes (Researcher, Critic, Writer) that glow, pulse, and animate data flows as live actions run.
*   **Streaming UI**: Native readable-stream consumer consuming POST Server-Sent Events dynamically.
*   **Briefing Center**: Built-in Markdown-to-HTML parser rendering complex briefings, blockquotes, code-blocks, and tables without external dependency overhead.

---

## 📂 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── agents/          # Collaborative Multi-Agent Logic
│   │   │   ├── base.py
│   │   │   ├── researcher.py
│   │   │   ├── critic.py
│   │   │   ├── writer.py
│   │   │   └── orchestrator.py
│   │   ├── database/        # Local NumPy + SQLite Vector Database
│   │   │   └── vector_store.py
│   │   ├── utils/           # Search and LLM integrations
│   │   │   ├── llm.py
│   │   │   └── search.py
│   │   ├── config.py        # Settings and file schema
│   │   └── main.py          # FastAPI application & SSE endpoints
│   ├── tests/
│   │   └── verify_agents.py # Synchronous pipeline verification script
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Glassmorphic React dashboard views
│   │   │   ├── AgentDashboard.jsx
│   │   │   ├── KnowledgeBase.jsx
│   │   │   ├── ReportViewer.jsx
│   │   │   └── SettingsPanel.jsx
│   │   ├── App.jsx          # Sidebar navigator layout
│   │   ├── index.css        # Cosmic Slate custom design system
│   │   └── main.jsx
│   └── package.json         # Node configurations
├── start.ps1                # Unified dual-server startup script
└── README.md
```

---

## 🚀 Getting Started (Setup & Execution)

### Prerequisites
*   [Python 3.10+](https://www.python.org/downloads/)
*   [Node.js v18+](https://nodejs.org/)

### ⚡ One-Click Startup (Recommended)
We've bundled a unified PowerShell script in the root directory. To run it:

1.  Open PowerShell in the project directory.
2.  Run the startup script:
    ```powershell
    .\start.ps1
    ```
    This automatically boots the **Python FastAPI Backend Server** on `http://127.0.0.1:8000` in a new window, launches the **React Vite Developer Server** on `http://localhost:5173/`, and opens your dashboard in your browser.

---

### 🔧 Manual Setup

If you prefer to start each component manually:

#### 1. Configure Python Backend
```bash
cd backend
# Create a virtual environment
python -m venv venv
# Activate the environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```
API docs will be available at `http://127.0.0.1:8000/docs`.

#### 2. Configure React Frontend
```bash
cd frontend
# Install packages
npm install

# Start developer server
npm run dev
```
Open your browser to `http://localhost:5173/`.

---

## ⚙️ Configuration & Key Storage

The system executes in a fully-featured **Local Simulation Sandbox** out-of-the-box if no keys are provided.

To upgrade to live web crawling and generation:
1.  Navigate to the **Credentials Config** tab in the dashboard.
2.  Provide your **Google Gemini API Key** (for agent reasoning), **OpenAI API Key** (secondary fallback), and **Tavily API Key** (for competitor web searches).
3.  Click **Save Configurations** (keys are saved locally to `backend/data/settings.json`, which is entirely git-ignored for safety).
