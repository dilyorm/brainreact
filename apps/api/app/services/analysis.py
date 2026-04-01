from __future__ import annotations

import json
import uuid

from ..db import get_connection, row_to_dict, utc_now_iso
from .gemini import generate_interpretation
from .tribe import run_tribe_analysis


def create_analysis_record(
    original_filename: str,
    stored_filename: str,
    video_path: str,
    public_video_path: str,
    interpreter_model: str,
) -> dict:
    analysis_id = uuid.uuid4().hex
    now = utc_now_iso()
    with get_connection() as connection:
        columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(analyses)").fetchall()
        }
        if "gemini_model" in columns:
            connection.execute(
                """
                INSERT INTO analyses (
                    id, original_filename, stored_filename, video_path, public_video_path,
                    status, interpreter_model, gemini_model, error_message, result_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    analysis_id,
                    original_filename,
                    stored_filename,
                    video_path,
                    public_video_path,
                    "queued",
                    interpreter_model,
                    interpreter_model,
                    None,
                    None,
                    now,
                    now,
                ),
            )
        else:
            connection.execute(
                """
                INSERT INTO analyses (
                    id, original_filename, stored_filename, video_path, public_video_path,
                    status, interpreter_model, error_message, result_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    analysis_id,
                    original_filename,
                    stored_filename,
                    video_path,
                    public_video_path,
                    "queued",
                    interpreter_model,
                    None,
                    None,
                    now,
                    now,
                ),
            )
    return get_analysis_record(analysis_id)


def list_analysis_records() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM analyses ORDER BY created_at DESC LIMIT 20"
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def get_analysis_record(analysis_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
        ).fetchone()
    return row_to_dict(row)


def update_analysis_status(analysis_id: str, status: str, error_message: str | None = None) -> None:
    with get_connection() as connection:
        connection.execute(
            "UPDATE analyses SET status = ?, error_message = ?, updated_at = ? WHERE id = ?",
            (status, error_message, utc_now_iso(), analysis_id),
        )


def complete_analysis(analysis_id: str, result: dict) -> None:
    with get_connection() as connection:
        connection.execute(
            "UPDATE analyses SET status = ?, result_json = ?, updated_at = ?, error_message = NULL WHERE id = ?",
            ("completed", json.dumps(result), utc_now_iso(), analysis_id),
        )


def run_analysis_pipeline(analysis_id: str) -> None:
    update_analysis_status(analysis_id, "processing")
    record = get_analysis_record(analysis_id)
    if record is None:
        return

    try:
        tribe_result = run_tribe_analysis(video_path=record["video_path"], analysis_id=analysis_id)
        interpretation = generate_interpretation(record["interpreter_model"], tribe_result)
        complete_analysis(
            analysis_id,
            {
                "tribe": tribe_result,
                "interpretation": interpretation,
                "method": {
                    "source": "TRIBE v2 multimodal brain-response prediction + selectable LLM interpretation",
                    "hemodynamic_lag_seconds": tribe_result.get("hemodynamic_lag_seconds", 5),
                    "interpreter_model": record["interpreter_model"],
                },
            },
        )
    except Exception as exc:
        update_analysis_status(analysis_id, "error", str(exc))
