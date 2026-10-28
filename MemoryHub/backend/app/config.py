from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'postgresql+psycopg://memoryhub:CHANGE_ME@db:5432/memoryhub'
    data_dir: Path = Path('data')
    public_url: str = 'http://127.0.0.1:8765'
    cookie_secure: bool = True
    model_base_url: str = ''
    generation_model: str = ''
    embedding_model: str = ''
    model_external: bool = False
    model_timeout: int = 45
    max_body_bytes: int = 8_000_000
    session_hours: int = 12
    frontend_dir: Path = Path('../frontend/dist')


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
(settings.data_dir / 'sources').mkdir(exist_ok=True)
