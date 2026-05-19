from src.core.application.repositories.user_repo.dependencies import get_current_user
from fastapi import APIRouter, Depends, UploadFile, File
from src.core.domain.models import User
from src.core.application.repositories.cv_repo.dependencies import get_cv_repo
from src.core.application.repositories.cv_repo import ICVRepository
from src.core.application.repositories.cv_repo.cvdtos import (
    UploadCVResponse,
    CVCreate,
    CVDto,
    CVDuplicateConfirmRequest,
    CVDuplicateConfirmResponse,
)
from src.api.config.exceptions import ValidationException, CVDuplicateException

router = APIRouter(prefix="/cv", tags=["CV Management"])

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/upload", response_model=UploadCVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    repositories: ICVRepository = Depends(get_cv_repo),
):
    user_id = current_user.id
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationException(
            f"Định dạng '{ext}' không hỗ trợ. Chỉ chấp nhận: PDF, DOC, DOCX"
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationException(
            f"Content type không hợp lệ: {file.content_type}"
        )

    file_bytes = await file.read()

    try:
        cv_doc = await repositories.upload_cv(
            CVCreate(user_id=user_id, file_bytes=file_bytes, file_name=file.filename)
        )
        return UploadCVResponse(
            success=True,
            is_duplicate=False,
            cv=CVDto.model_validate(cv_doc),
            message="CV đã được phân tích thành công",
        )
    except CVDuplicateException as e:
        return UploadCVResponse(
            success=False,
            is_duplicate=True,
            existing_cv=CVDto.model_validate(e.existing_cv),
            message="CV đã tồn tại trong hệ thống",
        )


@router.post("/duplicate/confirm", response_model=CVDuplicateConfirmResponse)
async def confirm_duplicate(
    req: CVDuplicateConfirmRequest,
    current_user: User = Depends(get_current_user),
    repositories: ICVRepository = Depends(get_cv_repo),
):
    if not req.confirm:
        return CVDuplicateConfirmResponse(
            cv_id=req.existing_cv_id,
            reused=True,
            message="Sử dụng CV hiện có",
        )

    new_cv = await repositories.clone_cv(
        existing_cv_id=req.existing_cv_id,
        user_id=current_user.id,
    )
    return CVDuplicateConfirmResponse(
        cv_id=new_cv.id,
        reused=False,
        message="Đã tạo phiên tìm việc mới",
    )
