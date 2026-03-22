from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    BCRYPT_COST: int = 12
    AUTH_ENABLED: bool = True
    SEED_ADMIN_EMAIL: str
    SEED_ADMIN_PASSWORD: str
    CORS_ORIGINS: str = ""
    COOKIE_SECURE: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()
