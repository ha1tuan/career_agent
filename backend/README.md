### Yêu cầu

- Python 3.12+
- PostgreSQL 14+
- Redis 7+
- Ollama (nếu dùng LLM local) hoặc Gemini API key

### Cấu hình `.env`

```env
APP_NAME=Career Agent API
DEBUG=false

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/career_agent

# Redis
REDIS_URL=redis://localhost:6379

# LLM Provider: gemini | ollama
LLM_PROVIDER=ollama
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest

# Search
TAVILY_API_KEY=tvly-...

# Auth
SECRET_KEY=your_secret_key_min_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# File Upload
MAX_UPLOAD_SIZE_MB=10
UPLOAD_DIR=uploads
```

### Cài đặt và khởi chạy

```bash
# Cài dependencies
pip install -r requirements.txt

# Chạy database migration
alembic upgrade head

# Khởi động server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI tự động tại: `http://localhost:8000/docs`

### Alembic (Database Migration)

```bash
# Tạo migration mới
alembic revision --autogenerate -m "mô tả thay đổi"

# Apply migration
alembic upgrade head

# Rollback 1 bước
alembic downgrade -1
```
