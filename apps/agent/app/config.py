from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    api_base_url: str = "http://localhost:3001/api"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    # Google AI Studio / Gemini model id
    default_model: str = "gemini-2.5-flash"
    llm_provider: str = "gemini"
    request_timeout_seconds: int = 300
    jwt_access_secret: str = ""
    # Max simultaneous agent graphs per uvicorn worker (scale out with replicas × workers).
    max_concurrent_runs: int = 16
    # Seconds to wait for a run slot before returning 503 (client should retry).
    run_slot_wait_seconds: float = 30.0
    max_agent_iterations: int = 8
    max_bound_tools: int = 40
    max_tool_calls_per_run: int = 24
    # Max tools executing concurrently within one agent run.
    max_parallel_tool_calls: int = 8
    # Tools per HTTP batch request (tools/call_batch on the API).
    tool_batch_size: int = 8
    # Global cap on in-flight tool HTTP calls per uvicorn worker (all runs).
    max_concurrent_tool_calls: int = 64
    tool_cache_ttl_sec: float = 90.0
    tool_cache_max_orgs: int = 512
    http_max_connections: int = 200
    http_max_keepalive: int = 80
    uvicorn_workers: int = 4


settings = Settings()
