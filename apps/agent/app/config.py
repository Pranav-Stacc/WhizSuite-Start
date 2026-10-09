from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    api_base_url: str = "http://localhost:3001/api"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    # Google AI Studio / Gemini model id
    default_model: str = "gemini-2.0-flash"
    llm_provider: str = "gemini"
    request_timeout_seconds: int = 120


settings = Settings()
