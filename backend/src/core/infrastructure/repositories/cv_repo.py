import json
from typing import override
from src.core.application.services.cv_service.i_cv_service import ICVService
import uuid as uuid_lib
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.application.repositories.cv_repo.ICVRepository import ICVRepository
from src.core.application.repositories.cv_repo.cvdtos import CVCreate, CVDto
from typing import Optional
from src.api.config.exceptions import ValidationException, NotFoundException, CVDuplicateException
from src.api.config.settings import get_settings
from src.core.orchestration.prompts.parser_prompt import CV_PARSER_PROMPT
from src.core.application.services.llm_service.i_llm_service import ILLMService
from src.core.domain.models import CVDocument

class CVRepository(ICVRepository):
    def __init__(self, llm: ILLMService, session: AsyncSession, service: ICVService):
        self.session = session
        self.service = service
        self._settings = get_settings()
        self.llm = llm

    @staticmethod
    def _parse_llm_json(response: str) -> dict:
        """Strip markdown fences and parse JSON from LLM response."""
        cleaned = response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            return {}

    @override
    async def upload_cv(self, cv_in: CVCreate) -> Optional[CVDto]:

        # Bước 1: Kiểm tra file upload
        max_bytes = get_settings().MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(cv_in.file_bytes) > max_bytes:
            raise ValidationException(
                f"File quá lớn. Tối đa {get_settings().MAX_UPLOAD_SIZE_MB}MB"
            )
        
        # Bước 2: Kiểm tra hash CV
        file_hash = self.service.compute_hash(cv_in.file_bytes)
        existing_cv = await self.service.find_by_hash(cv_in.user_id, file_hash)
        if existing_cv:
            raise CVDuplicateException(existing_cv=existing_cv)
        
        # Bước 3: Extract text
        raw_text = await self.service.extract_text(cv_in.file_bytes, cv_in.file_name)

        # Bước 4: Parse bằng LLM — stream
        prompt        = CV_PARSER_PROMPT.format(cv_text=raw_text)
        full_response = ""

        async for token in self.llm.stream(prompt):
            full_response += token
        
        # Clean và parse JSON
        cv_data = self._parse_llm_json(full_response)

        # Bước 5: Lưu file
        file_path = await self.service._save_file(cv_in.user_id, cv_in.file_bytes, cv_in.file_name, file_hash)   

        # Bước 6: Lưu DB
        cv = CVDocument(
            user_id=cv_in.user_id,
            file_name=cv_in.file_name,
            file_path=file_path,
            file_type=cv_in.file_name.rsplit(".", 1)[-1].lower(),
            file_hash=file_hash,
            raw_text=raw_text,
            cv_data=cv_data,
        )
        self.session.add(cv)
        await self.session.commit()
        await self.session.refresh(cv)
        return CVDto.model_validate(cv)
    
    @override
    async def get_cv_by_id(self, cv_id: UUID) -> CVDto:
        cv = await self.session.get(CVDocument, cv_id)
        if not cv:
            raise NotFoundException(f"CV không tồn tại với ID: {cv_id}")
        return CVDto.model_validate(cv)

    @override
    async def clone_cv(self, existing_cv_id: UUID, user_id: UUID) -> CVDto:
        existing = await self.session.get(CVDocument, existing_cv_id)
        if not existing or existing.user_id != user_id:
            raise NotFoundException("CV")

        new_cv = CVDocument(
            user_id=user_id,
            file_name=existing.file_name,
            file_path=existing.file_path,
            file_type=existing.file_type,
            file_hash=uuid_lib.uuid4().hex,
            raw_text=existing.raw_text,
            cv_data=existing.cv_data,
        )
        self.session.add(new_cv)
        await self.session.commit()
        await self.session.refresh(new_cv)
        return CVDto.model_validate(new_cv)