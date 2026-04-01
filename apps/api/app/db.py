import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, UTC

from .config import settings


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def ensure_storage() -> None:
    settings.base_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.public_dir.mkdir(parents=True, exist_ok=True)
    settings.cache_dir.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_connection():
    ensure_storage()
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                video_path TEXT NOT NULL,
                public_video_path TEXT NOT NULL,
                status TEXT NOT NULL,
                interpreter_model TEXT,
                error_message TEXT,
                result_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(analyses)").fetchall()
        }
        if "interpreter_model" not in columns:
            connection.execute("ALTER TABLE analyses ADD COLUMN interpreter_model TEXT")
            if "gemini_model" in columns:
                connection.execute(
                    "UPDATE analyses SET interpreter_model = gemini_model WHERE interpreter_model IS NULL"
                )
        if "gemini_model" in columns:
            connection.execute(
                "UPDATE analyses SET interpreter_model = COALESCE(interpreter_model, gemini_model, ?)",
                (settings.default_interpreter_model,),
            )
        else:
            connection.execute(
                "UPDATE analyses SET interpreter_model = COALESCE(interpreter_model, ?)",
                (settings.default_interpreter_model,),
            )


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    item = dict(row)
    if item.get("interpreter_model") is None:
        item["interpreter_model"] = item.get("gemini_model") or settings.default_interpreter_model
    result_json = item.get("result_json")
    item["result"] = json.loads(result_json) if result_json else None
    item.pop("result_json", None)
    return item
