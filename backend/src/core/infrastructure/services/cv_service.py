from src.api.config.settings import get_settings
import os
from typing import override
from src.core.domain.models import CVDocument
import hashlib
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.core.application.services.cv_service.i_cv_service import ICVService
from src.core.application.repositories.cv_repo.cvdtos import CVCreate, CVDto
import io
from pypdf import PdfReader
from docx import Document

class CVService(ICVService):

    def __init__(self, session: AsyncSession):
        self.session = session

    @override
    def compute_hash(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()
    
    @override    
    async def find_by_hash(
        self,
        user_id: UUID,
        file_hash: str
    ) -> CVDto | None:
        # ĐÃ SỬA: Dùng trực tiếp biến session truyền vào hàm, không dùng self.session
        result = await self.session.execute(
            select(CVDocument).where(
                CVDocument.user_id == user_id,
                CVDocument.file_hash == file_hash,
            )
        )

        document = result.scalar_one_or_none()

        return CVDto.model_validate(document) if document else None

    @override    
    async def _save_file(
        self,
        user_id: UUID,
        file_bytes: bytes,
        file_name: str,
        file_hash: str,
    ) -> str:
        settings = get_settings()
        save_dir = f"{settings.UPLOAD_DIR}/{file_hash}"
        os.makedirs(save_dir, exist_ok=True)
        file_path = f"{save_dir}/{file_name}"
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return file_path

    @override
    async def extract_text(self, file_bytes: bytes, file_name: str) -> str:
        """
        Router function — tự detect format và gọi đúng extractor.
        Đây là hàm duy nhất Service layer cần biết.
        """
        ext = file_name.rsplit(".", 1)[-1].lower()

        # ĐÃ SỬA: Trỏ dictionary map tới các staticmethod trong class bằng self
        extractors = {
            "pdf":  self.extract_text_from_pdf,
            "docx": self.extract_text_from_docx,
            "doc":  self.extract_text_from_docx,
        }

        extractor = extractors.get(ext)
        if not extractor:
            raise ValueError(
                f"Định dạng '{ext}' không hỗ trợ. "
                f"Chỉ chấp nhận: {', '.join(extractors.keys())}"
            )

        # Fix: Loại bỏ ký tự null byte (\x00) thường có trong file PDF gây lỗi DB
        extracted_text = extractor(file_bytes)
        return extracted_text.replace("\x00", "")

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """
        Đọc từng page, bỏ qua page rỗng.
        Dùng double newline để giữ cấu trúc section.
        """
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []

            for page in reader.pages:
                text = page.extract_text()
                if text and text.strip():
                    pages_text.append(text.strip())

            if not pages_text:
                raise ValueError("PDF không có nội dung text")

            return "\n\n".join(pages_text)

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Không thể đọc PDF: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        """
        Đọc từng paragraph, bỏ qua dòng trắng.
        Giữ double newline để LLM nhận biết section break.
        """
        try:
            doc = Document(io.BytesIO(file_bytes))
            paragraphs = []

            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    paragraphs.append(text)

            if not paragraphs:
                raise ValueError("DOCX không có nội dung text")

            return "\n\n".join(paragraphs)

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Không thể đọc DOCX: {str(e)}")

    @override
    async def get_cv_by_id(self, cv_id: UUID) -> CVDto:
        result = await self.session.execute(
            select(CVDocument).where(
                CVDocument.id == cv_id
            )
        )

        document = result.scalar_one_or_none()

        return CVDto.model_validate(document) if document else None

    @override
    async def create_session_id(self, user_id: UUID, cv_id: UUID) -> str:
        """Tạo session_id xác định từ user_id + cv_id."""
        user_short = str(user_id).replace("-", "")[:8]
        cv_short   = str(cv_id).replace("-", "")[:8]
        return f"agent_{user_short}_{cv_short}"