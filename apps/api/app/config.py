from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_api_url: str = Field(default="https://generativelanguage.googleapis.com/v1beta", alias="GEMINI_API_URL")
    nvidia_api_key: str | None = Field(default=None, alias="NVIDIA_API_KEY")
    nvidia_api_url: str = Field(default="https://integrate.api.nvidia.com/v1", alias="NVIDIA_API_URL")
    default_interpreter_model: str = Field(default="gemini-3-flash-preview", alias="DEFAULT_INTERPRETER_MODEL")
    max_upload_mb: int = Field(default=250, alias="MAX_UPLOAD_MB")
    data_dir: str | None = Field(default=None, alias="DATA_DIR")

    @property
    def base_dir(self) -> Path:
        if self.data_dir:
            return Path(self.data_dir)
        return Path(__file__).resolve().parent / "storage"

    @property
    def upload_dir(self) -> Path:
        return self.base_dir / "uploads"

    @property
    def public_dir(self) -> Path:
        return self.base_dir / "public"

    @property
    def database_path(self) -> Path:
        return self.base_dir / "brainreact.sqlite3"

    @property
    def cache_dir(self) -> Path:
        return self.base_dir / "cache"


settings = Settings()
