from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/bookwheel"

    # Auth / JWT
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 14  # 14 days

    # CORS — frontend origin
    frontend_origin: str = "http://localhost:3000"

    # Cookie
    cookie_name: str = "access_token"
    cookie_secure: bool = False  # True in production (HTTPS)


@lru_cache
def get_settings() -> Settings:
    return Settings()
