from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./photostack.db"
    UPLOADS_DIR: str = "uploads"
    # Look up street addresses for GPS coordinates (OpenStreetMap Nominatim, needs internet).
    GEOCODING_ENABLED: bool = True
    # Enables optional AI tagging. AI features are off when unset.
    GEMINI_API_KEY: str | None = None
    # Public demo: visitors can browse, favorite and make albums, but not upload or delete photos.
    DEMO_MODE: bool = False


settings = Settings()
