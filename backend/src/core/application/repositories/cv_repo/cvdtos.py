from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime


class CVDto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    file_name: str
    file_type: str
    raw_text: Optional[str] = None
    cv_data: Optional[Dict[str, Any]] = None
    is_active: str
    created_at: datetime
    updated_at: datetime


class UploadCVResponse(BaseModel):
    success: bool
    is_duplicate: bool = False
    message: str = ""
    cv: Optional[CVDto] = None
    existing_cv: Optional[CVDto] = None


class CVDuplicateConfirmRequest(BaseModel):
    existing_cv_id: UUID
    confirm: bool


class CVDuplicateConfirmResponse(BaseModel):
    cv_id: UUID
    reused: bool
    message: str


class CVCreate(BaseModel):
    user_id: UUID
    file_bytes: bytes
    file_name: str
