from pydantic_settings import BaseSettings
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./photostack.db"
    GEMINI_API_KEY: str | None = None  # AI features are disabled when unset
    API_BASE_URL: str = "http://localhost:8000/api/v1"
    UPLOADS_DIR: str = "uploads"
    THUMBNAILS_DIR: str = "uploads/thumbnails"
    POSTGRES_DB: str = "db"
    POSTGRES_USER: str = "demo"
    POSTGRES_PASSWORD: str = "demo"

    LOGGING_CONFIG: dict = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
                "level": "INFO",
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "standard",
                "filename": "dam.log",
                "maxBytes": 10485760,  # 10 MB
                "backupCount": 5,
                "level": "INFO",
            },
        },
        "loggers": {
            "": {  # root logger
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "api": {  # Application-specific logger
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
