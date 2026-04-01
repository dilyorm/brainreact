import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from ..config import settings


def save_upload(upload: UploadFile) -> tuple[str, Path, str]:
    suffix = Path(upload.filename or "video.mp4").suffix or ".mp4"
    file_id = uuid.uuid4().hex
    stored_filename = f"{file_id}{suffix.lower()}"
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    target_path = settings.upload_dir / stored_filename

    with target_path.open("wb") as target:
        shutil.copyfileobj(upload.file, target)

    file_size = target_path.stat().st_size
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if file_size > max_bytes:
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload exceeds {settings.max_upload_mb} MB limit.",
        )

    public_path = f"/assets/uploads/{stored_filename}"
    return stored_filename, target_path, public_path
