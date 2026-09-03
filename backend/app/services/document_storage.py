"""
Secure document storage service.

Documents are stored under a directory outside the web root.
The path is never returned to clients — only a document ID is returned.
Bank officers and the owning student access documents through authenticated endpoints
that perform ownership/authorization checks before streaming the file.
"""
import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

# Secure storage root — configurable via DOCS_ROOT env var.
# Falls back to a sibling directory of the running process so it is never
# under any 'static' or 'public' folder that might be served directly.
_DOCS_ROOT = Path(os.environ.get("DOCS_ROOT", "/tmp/finwise_docs"))

# Allowed MIME types for uploads
ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

# Maximum file size: 10 MB
MAX_FILE_BYTES = 10 * 1024 * 1024

# Map of document_type -> human-readable label (extensible, not enforced server-side)
KNOWN_DOC_TYPES = {
    "student_id",
    "admission_proof",
    "fee_structure",
    "marksheet",
    "income_proof",
    "co_applicant_id",
    "co_applicant_income_proof",
    "bank_statement",
    "address_proof",
    "other",
}


def _ensure_root() -> None:
    _DOCS_ROOT.mkdir(parents=True, exist_ok=True)


def _app_dir(application_id: str) -> Path:
    """Return (and create) the per-application storage directory."""
    d = _DOCS_ROOT / application_id
    d.mkdir(parents=True, exist_ok=True)
    return d


async def save_document(
    application_id: str,
    doc_type: str,
    upload: UploadFile,
) -> tuple[str, str, int, str]:
    """
    Validate and persist an uploaded document.

    Returns (storage_path_relative_to_DOCS_ROOT, original_filename, file_size_bytes, mime_type).

    Raises HTTPException on validation failure.
    """
    _ensure_root()

    # --- Content-type check ---------------------------------------------------
    content_type = (upload.content_type or "").lower().split(";")[0].strip()
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type '{content_type}' is not allowed. "
                   f"Accepted: PDF, JPEG, PNG, WEBP, GIF.",
        )

    # --- Size check (stream into memory up to limit) -------------------------
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(65536)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed limit of {MAX_FILE_BYTES // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # --- Persist to disk with a random filename (never trust original name) ---
    ext_map = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = ext_map.get(content_type, ".bin")
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_dir = _app_dir(application_id)
    dest = dest_dir / safe_name

    with open(dest, "wb") as f:
        for chunk in chunks:
            f.write(chunk)

    # Store path relative to DOCS_ROOT so it stays portable
    relative_path = str(Path(application_id) / safe_name)
    original_filename = os.path.basename(upload.filename or "upload")

    return relative_path, original_filename, total, content_type


def open_document(storage_path: str):
    """
    Open a stored document for streaming.
    Raises HTTPException 404 if the file does not exist.
    The caller must have already verified ownership.
    """
    full = _DOCS_ROOT / storage_path
    if not full.exists() or not full.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return full


def delete_application_documents(application_id: str) -> None:
    """Remove all documents for a given application (used on hard delete)."""
    d = _DOCS_ROOT / application_id
    if d.exists():
        shutil.rmtree(d, ignore_errors=True)
