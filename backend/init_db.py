import asyncio
from src.core.domain.models import Base
from src.core.infrastructure.persistence.session import engine

async def init_db():
    print("⏳ Đang kết nối tới PostgreSQL và khởi tạo cấu trúc cơ sở dữ liệu...")
    try:
        # Sử dụng run_sync để chạy create_all trên async engine của SQLAlchemy
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Khởi tạo thành công tất cả các bảng:")
        print("   - users")
        print("   - cv_documents")
        print("   - cv_usage_history")
        print("   - interview_sessions")
    except Exception as e:
        print(f"❌ Lỗi khi khởi tạo database: {e}")

if __name__ == "__main__":
    asyncio.run(init_db())
 