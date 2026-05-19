# Sử dụng base image Python 3.12-slim tối ưu dung lượng và tốc độ build
FROM python:3.12-slim

# Thiết lập các biến môi trường để tối ưu hóa runtime Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các gói hệ thống cần thiết (nếu có package Python yêu cầu biên dịch C)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Sao chép tệp requirements.txt trước để tận dụng Docker Layer Cache
COPY requirements.txt .

# Nâng cấp pip và cài đặt dependencies mà không lưu cache
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn backend vào container
COPY . .

# Mở cổng 8000 của FastAPI ứng dụng
EXPOSE 8000

# Khởi chạy ứng dụng bằng uvicorn với cấu hình tối ưu
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
