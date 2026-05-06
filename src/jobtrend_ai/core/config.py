from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="JobTrend AI", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=True, alias="APP_DEBUG")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")

    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="jobtrend", alias="DB_NAME")
    db_user: str = Field(default="jobtrend", alias="DB_USER")
    db_password: str = Field(default="jobtrend", alias="DB_PASSWORD")

    headless: bool = Field(default=True, alias="HEADLESS")
    scraper_max_pages: int = Field(default=3, alias="SCRAPER_MAX_PAGES")
    scraper_rate_delay_min: float = Field(default=1.5, alias="SCRAPER_RATE_DELAY_MIN")
    scraper_rate_delay_max: float = Field(default=3.5, alias="SCRAPER_RATE_DELAY_MAX")
    scraper_timeout_ms: int = Field(default=30_000, alias="SCRAPER_TIMEOUT_MS")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
