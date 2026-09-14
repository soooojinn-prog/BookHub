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

    # Environment (development | production) — informational / future use
    environment: str = "development"

    # CORS — frontend origin (exact origin of the deployed frontend)
    frontend_origin: str = "http://localhost:3000"

    # Cookie
    cookie_name: str = "access_token"
    cookie_secure: bool = False  # True in production (HTTPS)
    # "lax" for same-site (frontend & backend share a site); "none" for cross-site
    # deployments (different domains) — "none" REQUIRES cookie_secure=True.
    cookie_samesite: str = "lax"

    @property
    def cors_origins(self) -> list[str]:
        """Allowed CORS origins — comma-separated in FRONTEND_ORIGIN (e.g. prod + preview)."""
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
