import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Column, String, DateTime, JSON,
    ForeignKey, Text, Enum as SAEnum, Integer, Boolean
)
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    
    pass


class UsageAction(str, enum.Enum):
    JOB_SEARCH   = "job_search"
    INTERVIEW    = "interview"
    COMPANY_RESEARCH = "company_research"


class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email      = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name  = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    cv_documents = relationship(
        "CVDocument",
        back_populates="user",
        cascade="all, delete-orphan",  # Xóa user → xóa CV luôn
        order_by="CVDocument.created_at.desc()"
    )


class CVDocument(Base):
    __tablename__ = "cv_documents"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # File gốc
    file_name    = Column(String(255), nullable=False)   # "NguyenVanA_CV.pdf"
    file_path    = Column(String(500), nullable=False)   # "uploads/user_id/uuid.pdf"
    file_type    = Column(String(10), nullable=False)    # "pdf" | "docx"
    file_hash    = Column(String(64), nullable=False)    # SHA256 — tránh parse lại

    # Kết quả parse
    raw_text     = Column(Text)                          # Text thô extract được
    cv_data      = Column(JSON)                          # CVData TypedDict as JSON

    # Metadata
    is_active    = Column(String(1), default="Y")        # CV đang dùng chính
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user         = relationship("User", back_populates="cv_documents")
    usage_history = relationship(
        "CVUsageHistory",
        back_populates="cv_document",
        cascade="all, delete-orphan",
        order_by="CVUsageHistory.created_at.desc()"
    )


class CVUsageHistory(Base):
    __tablename__ = "cv_usage_history"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cv_document_id  = Column(UUID(as_uuid=True), ForeignKey("cv_documents.id"), nullable=False)

    # Loại action
    action          = Column(SAEnum(UsageAction), nullable=False)

    # Snapshot input/output — lưu JSON tự do
    input_snapshot  = Column(JSON)   # {"keywords": "Python developer Hanoi"}
    result_snapshot = Column(JSON)   # {"jobs_found": 5, "top_job": {...}}

    # Agent session
    session_id      = Column(String(100))   # Để trace lại graph run

    created_at      = Column(DateTime, default=datetime.utcnow)

    # Relationship
    cv_document     = relationship("CVDocument", back_populates="usage_history")

class InterviewHistoryItem(Base):
    __tablename__ = "interview_sessions"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cv_id        = Column(UUID(as_uuid=True), ForeignKey("cv_documents.id"), nullable=False)
    session_id   = Column(String(100), nullable=False, index=True)

    # Job context
    job_title    = Column(String(255))
    company_name = Column(String(255))

    # Kết quả
    total_score  = Column(String(10))     # "75"
    level        = Column(String(50))     # "Tốt|Khá|Trung bình"
    summary      = Column(JSON)           # Full summary JSON

    # Toàn bộ Q&A
    qa_history   = Column(JSON)           # list[QAPair]

    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user         = relationship("User")

class AgentSession(Base):
    """
    Lưu toàn bộ kết quả session tìm việc.
    """
    __tablename__ = "agent_sessions"

    id         = Column(
        UUID(as_uuid=True), primary_key=True,
        default=uuid.uuid4
    )
    session_id = Column(
        String(100), nullable=False,
        unique=True, index=True
    )
    user_id    = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    cv_id      = Column(
        UUID(as_uuid=True),
        ForeignKey("cv_documents.id"),
        nullable=False,
    )

    # ── Trạng thái ────────────────────────────────
    current_step = Column(String(50), default="ready")

    # ── Job Results ───────────────────────────────
    job_count   = Column(Integer,  default=0)
    job_results = Column(JSON,     nullable=True)

    # ── Job được chọn ─────────────────────────────
    selected_job = Column(JSON, nullable=True)

    # ── Company Research ──────────────────────────
    company_research = Column(JSON, nullable=True)

    # ── Action — chỉ có interview ─────────────────
    is_interview = Column(Boolean, default=False, nullable=False)

    # ── Interview Results ─────────────────────────
    interview_qa_pairs  = Column(JSON,    nullable=True)
    interview_evaluated = Column(JSON,    nullable=True)
    interview_summary   = Column(JSON,    nullable=True)
    interview_score     = Column(Integer, nullable=True)
    interview_level     = Column(String(50), nullable=True)

    # ── Timestamps ────────────────────────────────
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(
        DateTime,
        default   = datetime.utcnow,
        onupdate  = datetime.utcnow,
    )
    completed_at = Column(DateTime, nullable=True)

    # ── Relationships ─────────────────────────────
    user        = relationship("User")
    cv_document = relationship("CVDocument")
    qa_pairs    = relationship("InterviewQAPair", back_populates="agent_session", cascade="all, delete-orphan")

class InterviewQAPair(Base):
    __tablename__ = "interview_qa_pairs"

    id         = Column(UUID(as_uuid=True), primary_key=True,
                        default=uuid.uuid4)
    session_id = Column(String(100),
                        ForeignKey("agent_sessions.session_id"),
                        nullable=False, index=True)
    qa_index   = Column(Integer,  nullable=False)
    round      = Column(String(50), nullable=False)
    question   = Column(Text,     nullable=False)
    answer     = Column(Text,     nullable=True)
    score      = Column(Integer,  nullable=True)
    feedback   = Column(Text,     nullable=True)
    suggestion = Column(Text,     nullable=True)
    asked_at   = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)

    agent_session = relationship(
        "AgentSession",
        back_populates="qa_pairs",
    )