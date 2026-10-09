# WhizSuite Agent Runtime (LangGraph)

Python FastAPI service for multi-agent orchestration. Executes **only** through Nest capability/MCP tools under the user's JWT.

Default LLM: **Google Gemini** (`GEMINI_API_KEY`).

## Run locally

```bash
cd apps/agent
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
set GEMINI_API_KEY=...
set API_BASE_URL=http://localhost:3001/api
uvicorn app.main:app --reload --port 8000
```

Set `AGENT_SERVICE_URL=http://localhost:8000` in `apps/api` env.

Optional: `LLM_PROVIDER=openai|anthropic|gemini` and matching API keys.
