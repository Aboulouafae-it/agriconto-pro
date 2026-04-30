from functools import lru_cache

from pydantic import AnyHttpUrl, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "AgriConto Pro"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://agriconto:agriconto@localhost:5432/agriconto"
    jwt_secret_key: str = Field(default="development-only-replace-with-env-secret")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    storage_root: str = "./storage"

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if self.environment.lower() in {"production", "prod"}:
            if (
                self.jwt_secret_key == "development-only-replace-with-env-secret"
                or len(self.jwt_secret_key) < 32
            ):
                raise ValueError("JWT_SECRET_KEY must be a strong production secret")
        return self

    @property
    def cors_origin_list(self) -> list[str | AnyHttpUrl]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
