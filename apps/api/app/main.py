from __future__ import annotations

from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import ensure_storage, init_db
from .schemas import AnalysisCreateResponse, AnalysisRecord, InterpreterModelOption
from .services.analysis import (
    create_analysis_record,
    get_analysis_record,
    list_analysis_records,
    run_analysis_pipeline,
)
from .services.gemini import AVAILABLE_INTERPRETER_MODELS
from .services.storage import save_upload


app = FastAPI(title="BrainReact API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    ensure_storage()
    init_db()


app.mount("/assets", StaticFiles(directory=settings.base_dir), name="assets")


def _build_record_response(record: dict, request: Request) -> dict:
    public_path = record.get("public_video_path", "")
    if public_path.startswith("/"):
        record["public_video_url"] = str(request.base_url).rstrip("/") + public_path
    else:
        record["public_video_url"] = public_path
    return record


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/interpreter-models", response_model=list[InterpreterModelOption])
def interpreter_models() -> list[InterpreterModelOption]:
    return AVAILABLE_INTERPRETER_MODELS


@app.get("/gemini-models", response_model=list[InterpreterModelOption])
def gemini_models_alias() -> list[InterpreterModelOption]:
    return AVAILABLE_INTERPRETER_MODELS


@app.get("/analyses", response_model=list[AnalysisRecord])
def list_analyses(request: Request) -> list[dict]:
    return [_build_record_response(record, request) for record in list_analysis_records()]


@app.get("/analyses/{analysis_id}", response_model=AnalysisRecord)
def get_analysis(analysis_id: str, request: Request) -> dict:
    record = get_analysis_record(analysis_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return _build_record_response(record, request)


@app.post("/analyses", response_model=AnalysisCreateResponse, status_code=status.HTTP_202_ACCEPTED)
def create_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    interpreter_model: str | None = Form(default=None),
    gemini_model: str | None = Form(default=None),
) -> AnalysisCreateResponse:
    selected_model = interpreter_model or gemini_model or settings.default_interpreter_model
    allowed = {item["id"] for item in AVAILABLE_INTERPRETER_MODELS}
    if selected_model not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported interpreter model.")
    if not video.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing upload filename.")

    suffix = Path(video.filename).suffix.lower()
    if suffix not in {".mp4", ".mov", ".mkv", ".webm", ".avi"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported video format.")

    stored_filename, target_path, public_path = save_upload(video)
    record = create_analysis_record(
        original_filename=video.filename,
        stored_filename=stored_filename,
        video_path=str(target_path),
        public_video_path=public_path,
        interpreter_model=selected_model,
    )
    background_tasks.add_task(run_analysis_pipeline, record["id"])
    return AnalysisCreateResponse(id=record["id"], status=record["status"])
