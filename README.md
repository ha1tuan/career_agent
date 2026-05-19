# 🚀 Hướng Dẫn Khởi Chạy Dự Án Bằng Docker

Chào mừng bạn đến với tài liệu hướng dẫn triển khai và vận hành hệ thống **AI Career Agent**. Hệ thống sử dụng mô hình **FastAPI (Python)** ở Backend và **ReactJS (Vite)** ở Frontend, được đóng gói chuẩn hóa bằng **Docker** và điều phối bằng **Docker Compose** để chạy mượt mà trên mọi môi trường Linux/macOS/Windows.

---

## 📂 Cấu Trúc Thư Mục Triển Khai

```text
career/
├── backend/
│   ├── Dockerfile             # Cấu hình container Python FastAPI
│   ├── .dockerignore          # Loại bỏ tệp rác khi build Backend
│   ├── requirements.txt       # Danh sách thư viện Python
│   └── src/                   # Mã nguồn Backend
├── frontend/
│   ├── Dockerfile             # Cấu hình Multi-stage build ReactJS + Nginx
│   ├── .dockerignore          # Loại bỏ tệp rác khi build Frontend
│   ├── .env.production        # Cấu hình API Endpoint môi trường Production
│   └── src/                   # Mã nguồn Frontend
├── docker-compose.yml         # File điều phối toàn bộ dịch vụ
└── README.md                  # Hướng dẫn này
```

---

# Luồng chạy API Agent — Chi tiết

Bước 1 — POST /api/v1/agent/start
Mục đích: Khởi tạo session. Không chạy graph, trả về ngay.

Bước 2 — GET /api/v1/agent/stream/{session_id}
Mục đích: Chạy graph và stream events SSE theo thời gian thực.

Bước 3 — POST /api/v1/agent/resume (HITL #1)
Mục đích: User chọn công ty. Ghi vào checkpoint, trả về ngay.

Bước 4 — GET /api/v1/agent/stream/{session_id} (lần 2)
Mục đích: FE reconnect SSE → graph resume từ company_researcher.

Bước 5 — POST /api/v1/agent/resume (HITL #2)
Mục đích: User quyết định phỏng vấn hay không.

Bước 6 — GET /api/v1/agent/stream/{session_id} (lần 3)
Mục đích: Graph resume → interviewer_node khởi động sub-graph phỏng vấn.

Bước 7 — POST /api/v1/agent/interview/answer (×5)
Mục đích: Vòng lặp hỏi-đáp. Mỗi lần gọi resume sub-graph một bước.

Bước 8 — GET /api/v1/agent/session/{session_id} (Restore sau F5)

Sơ đồ tổng quan transitions

POST /start
└─► [ready]
│
GET /stream (lần 1) — chạy job_finder
└─► [jobs_found] ──── hitl event ────► FE chờ user chọn công ty

POST /resume { company_name }
└─► [job_selected]
│
GET /stream (lần 2) — chạy company_researcher
└─► [companies_researched] ── hitl event ─► FE chờ user quyết định

POST /resume { is_interview: true }
└─► [action_selected]
│
GET /stream (lần 3) — chạy interviewer + generate first question
└─► [interviewing] ── hitl event ─► FE hiện câu hỏi

POST /interview/answer × 5
└─► [interview_done]

## 🛠️ Chuẩn Bị Trước Khi Chạy

### 1. Cài đặt Docker & Docker Compose

Đảm bảo máy chủ của bạn đã cài đặt Docker và Docker Compose:

- [Hướng dẫn cài đặt Docker](https://docs.docker.com/engine/install/)
- [Hướng dẫn cài đặt Docker Compose](https://docs.docker.com/compose/install/)

### 2. Cấu hình biến môi trường cho Backend

Hệ thống FastAPI yêu cầu các khóa bảo mật và các cổng dịch vụ (như Database, Redis, Gemini API).

- Di chuyển vào thư mục `backend/` và kiểm tra tệp `.env`.
- Đảm bảo các biến môi trường như `GEMINI_API_KEY`, cấu hình Database và Redis đã được khai báo chính xác trước khi khởi chạy Docker.

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

Hãy đứng ở thư mục gốc của dự án (`career/`) và thực hiện theo các bước sau:

### Bước 1: Khởi chạy các dịch vụ (Build & Run)

Chạy lệnh sau để Docker tự động build image và khởi chạy toàn bộ hệ thống ở chế độ chạy ngầm (detached mode):

```bash
docker compose up -d --build
```

> 💡 _Lệnh trên sẽ tự động cài đặt dependencies cho backend và frontend, đóng gói ứng dụng ReactJS vào Nginx và khởi chạy các container._

### Bước 2: Kiểm tra trạng thái hoạt động

Đảm bảo cả 2 container đều ở trạng thái `Up`:

```bash
docker compose ps
```

### Bước 3: Truy cập ứng dụng

- **Ứng dụng Frontend (ReactJS):** Truy cập địa chỉ `http://localhost:3000`
- **API Swagger Docs (FastAPI):** Truy cập địa chỉ `http://localhost:8000/docs`
- **Health Check API:** Truy cập địa chỉ `http://localhost:8000/health`

---

## 📊 Các Lệnh Quản Trị Hệ Thống (DevOps CLI)

Dưới đây là danh sách các lệnh thiết yếu để bạn giám sát và vận hành dự án trong quá trình chạy:

### 1. Giám sát Log hệ thống (Real-time Logs)

- **Theo dõi log của toàn bộ hệ thống:**
  ```bash
  docker compose logs -f
  ```
- **Theo dõi riêng log của Backend (FastAPI):**
  ```bash
  docker compose logs -f backend
  ```
- **Theo dõi riêng log của Frontend (Nginx/React):**
  ```bash
  docker compose logs -f frontend
  ```

### 2. Dừng hệ thống

Để dừng toàn bộ dịch vụ và giải phóng mạng ảo của Docker:

```bash
docker compose down
```

### 3. Khởi động lại hệ thống nhanh chóng

Nếu bạn có thay đổi cấu hình nhỏ và muốn khởi động lại nhanh:

```bash
docker compose restart
```

### 4. Build lại dự án sau khi sửa mã nguồn

Mỗi khi bạn cập nhật code ở backend hoặc frontend, hãy chạy lệnh này để build lại layer chứa mã nguồn mới:

```bash
docker compose up -d --build
```

---

## ⚠️ Lưu Ý Quan Trọng Cho Production

### 1. Phân quyền thư mục lưu trữ CV (`uploads/`)

Trong `docker-compose.yml`, thư mục `./backend/uploads` được mount vào container để lưu trữ các CV mà người dùng tải lên.
Hãy đảm bảo thư mục này có quyền ghi trên máy host:

```bash
mkdir -p backend/uploads
chmod 775 backend/uploads
```

### 2. Cấu hình Reverse Proxy Nginx & CORS

- Cấu hình CORS trong `backend/src/main.py` hiện tại cho phép các yêu cầu từ `http://localhost:3000`. Nếu bạn deploy lên một domain riêng (ví dụ: `https://my-career.com`), hãy cập nhật domain này trong danh sách `allow_origins` của Backend và tệp `.env.production` của Frontend.
