from src.api.config.redis_client import get_redis_client
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.config.settings import get_settings
from src.api.config.exceptions import CareerAgentException
from src.api.controller import auth
from src.api.controller import cv
from src.api.controller import agent
from src.api.controller import interview
from src.api.controller import history


settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print(f"🚀 {settings.APP_NAME} khởi động...")

    # Bước 1: Tạo checkpoint tables trong DB (sync, cần autocommit)
    from src.api.config.checkpointer import setup_checkpointer_tables
    setup_checkpointer_tables()

    # Bước 2: Khởi tạo async graphs (mở async pool + tạo singleton)
    from src.core.orchestration.graphs.graph import init_graph
    from src.core.orchestration.graphs.interview_graph import init_interview_graph
    await init_graph()
    await init_interview_graph()

    print(f"📦 Model: {settings.GEMINI_MODEL}")

    # Kiểm tra Redis
    redis_client = get_redis_client()
    try:
        await redis_client.ping()  # type: ignore[misc]
        print("✅ Redis: connected")
    except Exception as e:
        print(f"❌ Redis: {e}")

    yield

    # ── Shutdown ──
    from src.api.config.checkpointer import close_checkpointer
    await close_checkpointer()
    print("👋 App đang tắt...")


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="AI Agent hỗ trợ tìm việc làm",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Exception Handler ──
@app.exception_handler(CareerAgentException)
async def career_agent_exception_handler(
    request: Request,
    exc: CareerAgentException
):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "path": str(request.url)
        }
    )

# ── Routes ──
app.include_router(auth.router,      prefix="/api/v1")
app.include_router(cv.router,        prefix="/api/v1")
app.include_router(agent.router,     prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")

# ── Health Check ──
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "model": settings.GEMINI_MODEL,
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health"
    }