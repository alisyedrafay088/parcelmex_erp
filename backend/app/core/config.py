from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://root:password@localhost:3306/parcelo"
    secret_key: str = "change-this-secret-key"
    access_token_expire_minutes: int = 480
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
