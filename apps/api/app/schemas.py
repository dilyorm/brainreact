from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


AnalysisStatus = Literal["queued", "processing", "completed", "error"]


class InterpreterModelOption(BaseModel):
    id: str
    provider: str
    label: str
    description: str


class AnalysisCreateResponse(BaseModel):
    id: str
    status: AnalysisStatus


class AnalysisRecord(BaseModel):
    id: str
    original_filename: str
    stored_filename: str
    video_path: str
    public_video_path: str
    public_video_url: str | None = None
    status: AnalysisStatus
    interpreter_model: str
    error_message: str | None
    result: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
