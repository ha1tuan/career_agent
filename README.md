# 🚀 Hướng Dẫn Khởi Chạy Dự Án Bằng Docker

Chào mừng bạn đến với tài liệu hướng dẫn triển khai và vận hành hệ thống **AI Career Agent**. Hệ thống sử dụng mô hình **FastAPI (Python)** ở Backend và **ReactJS (Vite)** ở Frontend, được đóng gói chuẩn hóa bằng **Docker** và điều phối bằng **Docker Compose** để chạy mượt mà trên mọi môi trường Linux/macOS/Windows.

# Career Agent Backend

Backend cho hệ thống hỗ trợ tìm kiếm việc làm và luyện phỏng vấn tự động bằng AI, xây dựng trên **FastAPI** + **LangGraph** + **PostgreSQL** + **Redis**.

---

## Mục lục

1. [Chức năng hệ thống](#1-chức-năng-hệ-thống)
2. [Kiến trúc project](#2-kiến-trúc-project)
3. [LLM Graph & Luồng chạy](#3-llm-graph--luồng-chạy)
4. [API Endpoints](#4-api-endpoints)
5. [Cài đặt & Chạy](#5-cài-đặt--chạy)

---

## 1. Chức năng hệ thống

### Quản lý tài khoản

Đăng ký, đăng nhập, làm mới token (JWT HS256 + bcrypt). Mỗi người dùng có không gian làm việc riêng biệt với lịch sử được lưu vĩnh viễn.

### Tải & Phân tích CV

Upload file PDF hoặc DOCX, hệ thống tự động trích xuất văn bản và dùng LLM để cấu trúc hóa thành: thông tin cá nhân, học vấn, kinh nghiệm, kỹ năng, vị trí mong muốn. Phát hiện CV trùng lặp qua SHA-256 hash — cho phép tái sử dụng hoặc tạo mới.

### Tìm kiếm việc làm bằng AI (Job Finder)

Dựa trên dữ liệu CV, hệ thống tự động:

- Tìm kiếm job phù hợp trên mạng qua Tavily Search
- Trích xuất chi tiết từng job posting (mô tả, yêu cầu, phúc lợi, lương)
- LLM chấm điểm mức độ phù hợp (`match_score` 0–100) và lý do

### Nghiên cứu công ty (Company Researcher)

Sau khi người dùng chọn một job, hệ thống tự động thu thập thông tin về công ty đó: văn hóa làm việc, tech stack, sản phẩm, quy trình phỏng vấn, ưu/nhược điểm.

### Luyện phỏng vấn (AI Interviewer)

Tổ chức buổi phỏng vấn mô phỏng 5 câu hỏi được tạo tùy biến theo vị trí và công ty:

- Xoay vòng các loại câu hỏi: opening → technical → behavior → culture_fit
- Điều chỉnh độ khó dựa trên chất lượng câu trả lời trước
- Chấm điểm từng câu (0–10) và đưa ra đánh giá tổng thể cuối buổi

### Lịch sử & Resume

Toàn bộ lịch sử tìm việc và phỏng vấn được lưu trữ dài hạn. Hỗ trợ tiếp tục (resume) phiên làm việc bị gián đoạn.

---

## 2. Kiến trúc project

Project tổ chức theo **Clean Architecture** với 5 layer tách biệt:

```
src/
├── api/                         ← API Layer
│   ├── config/                  # Cấu hình, bảo mật, kết nối DB/Redis
│   └── controller/              # HTTP route handlers
│
└── core/
    ├── domain/                  ← Domain Layer
    │   └── models.py            # SQLAlchemy ORM models
    │
    ├── application/             ← Application Layer (Interfaces)
    │   ├── repositories/        # Abstract repository interfaces + DTOs
    │   └── services/            # Abstract service interfaces
    │
    ├── infrastructure/          ← Infrastructure Layer (Implementations)
    │   ├── persistence/         # SQLAlchemy session factory
    │   ├── repositories/        # SQL implementations
    │   └── services/            # LLM, CV, Session service implementations
    │
    └── orchestration/           ← Orchestration Layer (LangGraph)
        ├── graphs/              # Định nghĩa workflow (nodes + edges)
        ├── nodes/               # Logic xử lý từng bước AI
        ├── prompts/             # LLM prompt templates
        ├── state/               # TypedDict state definitions
        ├── session/             # Graph runner + event system
        └── utils/               # Helper utilities
```

### Mô tả từng Layer

#### API Layer (`src/api/`)

Tiếp nhận HTTP request, xác thực JWT, chuyển đổi Request/Response DTO, sau đó ủy thác cho các layer dưới. Không chứa business logic.

Các thành phần chính:

- `config/settings.py` — Pydantic Settings đọc từ `.env`
- `config/security.py` — Tạo/xác minh JWT, bcrypt password hashing
- `config/checkpointer.py` — Khởi tạo `AsyncPostgresSaver` cho LangGraph
- `config/redis_client.py` — Connection pool Redis
- `controller/` — 5 controller: auth, cv, agent, interview, history

#### Domain Layer (`src/core/domain/`)

Định nghĩa các ORM model ánh xạ với database. Không chứa logic, chỉ là cấu trúc dữ liệu:

| Model             | Mô tả                                                             |
| ----------------- | ----------------------------------------------------------------- |
| `User`            | Tài khoản người dùng                                              |
| `CVDocument`      | CV đã upload (raw text + structured JSON + file hash)             |
| `AgentSession`    | Phiên làm việc (job results, company research, interview summary) |
| `InterviewQAPair` | Từng cặp Q&A trong buổi phỏng vấn                                 |

#### Application Layer (`src/core/application/`)

Định nghĩa các **abstract interface** — hợp đồng giữa API layer và Infrastructure layer. Không có implementation cụ thể, cho phép thay thế dễ dàng (ví dụ: đổi từ Gemini sang Ollama mà không cần sửa API layer).

Các interface chính:

- `IUserRepository`, `ICVRepository`, `IAgentRepository`, `IInterviewRepository`, `ISessionHistoryRepository`
- `ILLMService` — `generate(prompt) → str`, `stream(prompt) → AsyncIterator`
- `ICVService` — trích xuất text, hash, lưu file
- `ISessionService` — quản lý session metadata trên Redis

#### Infrastructure Layer (`src/core/infrastructure/`)

Triển khai cụ thể các interface. Đây là nơi chứa code giao tiếp với external systems:

- **Repositories**: Truy vấn PostgreSQL bằng SQLAlchemy async
- **LLM Service**: `GeminiLLMService` (Gemini API) và `OllamaLLMService` (local), switch qua `LLM_PROVIDER` env var
- **CV Service**: Trích xuất text từ PDF/DOCX, tính SHA-256 hash, lưu file
- **Session Service**: Lưu/đọc session metadata trên Redis (TTL 24h), theo dõi tiến trình real-time

#### Orchestration Layer (`src/core/orchestration/`)

Định nghĩa và chạy **LangGraph workflow**. Quản lý state AI agent, điều phối các node xử lý, phát event lưu trữ sau mỗi bước.

- `graphs/` — Định nghĩa cấu trúc graph (nodes, edges, điều kiện rẽ nhánh, interrupt points)
- `nodes/` — Logic xử lý tại mỗi bước (gọi Tavily, gọi LLM, parse JSON)
- `state/` — `AgentState` và `InterviewState` TypedDict
- `session/graph_runner.py` — Chạy graph trong background, emit events vào DB/Redis

---

## 3. LLM Graph & Luồng chạy

Hệ thống dùng hai LangGraph graph: **Main Graph** và **Interview Sub-Graph** lồng nhau.

State được checkpoint vào PostgreSQL sau mỗi node — cho phép resume chính xác từ điểm bị gián đoạn, không cần chạy lại từ đầu.

---

### Main Graph

```
[START]
   │
   ▼
┌─────────────┐
│  job_finder │  ← Tìm và chấm điểm việc làm phù hợp
└──────┬──────┘
       │
       │  ── INTERRUPT ① ──────────────────────────────────────────────
       │     Người dùng xem danh sách job và chọn công ty muốn ứng tuyển
       │  ── POST /agent/resume { company_name, job_selected } ─────────
       │
       ▼
┌──────────────────────┐
│  company_researcher  │  ← Research thông tin công ty được chọn
└──────────┬───────────┘
           │
           │  ── INTERRUPT ② ──────────────────────────────────────────
           │     Người dùng quyết định có muốn luyện phỏng vấn không
           │  ── POST /agent/resume { is_interview: true|false } ────────
           │
           ▼
     [route_action]
           │
    ┌──────┴──────┐
    │             │
is_interview   else
    │             │
    ▼             ▼
┌──────────┐   [END]
│interviewer│ ← Khởi động interview sub-graph
└──────────┘
    │
    ▼
  [END]
```

#### Node `job_finder`

**File:** [src/core/orchestration/nodes/job_finder.py](src/core/orchestration/nodes/job_finder.py)

Tìm kiếm và xếp hạng việc làm phù hợp với CV của ứng viên.

```
Input:  cv_data { target_position, skills, experience, education }

Xử lý:
  1. Xây query từ cv_data: "{position} {top 3 skills} tuyển dụng 2026"
  2. Tavily.search(query, max_results=10)
       → Lọc bỏ các trang aggregator (trang danh sách job, search pages)
  3. Tavily.extract(top 5 URLs)
       → Lấy full content từng trang job posting cụ thể
  4. Gọi LLM với JOB_FINDER_PROMPT:
       → Extract: title, company, salary, location, requirements, benefits, ...
       → Tính match_score (0–100) và match_reason dựa vào CV
       → is_suggested = true nếu score ≥ 70
  5. Sắp xếp jobs theo match_score giảm dần

Output: job_results[] — danh sách job đã xếp hạng
        current_step = "jobs_found"
```

**Cache guard:** Nếu `current_step` đã là `jobs_found` hoặc sau đó → bỏ qua, không chạy lại.

---

#### Node `company_researcher`

**File:** [src/core/orchestration/nodes/company_researcher.py](src/core/orchestration/nodes/company_researcher.py)

Thu thập và cấu trúc hóa thông tin về công ty được chọn.

```
Input:  company_name (từ HITL #1), job_results

Xử lý:
  1. Xác định company_name từ state hoặc job_selected
  2. Resolve job_selected từ job_results nếu chưa có
  3. Tavily.search("{company} review culture interview tech stack")
       → max_results=5, không tìm trang tuyển dụng
  4. Gọi LLM với COMPANY_RESEARCH_PROMPT:
       → Parse: industry, size, culture, products[],
                tech_stack[], interview_process[], pros_cons

Output: company_research { ... }
        job_selected (nếu chưa được set)
        current_step = "companies_researched"
```

---

#### Node `interviewer` (Bridge)

**File:** [src/core/orchestration/nodes/interview_nodes.py](src/core/orchestration/nodes/interview_nodes.py)

Cầu nối giữa Main Graph và Interview Sub-Graph.

```
Input:  cv_data, job_selected, company_research từ AgentState

Xử lý:
  1. Khởi tạo InterviewState với context từ job và company
  2. Chạy interview_graph đến interrupt đầu tiên
       → generate_first_question chạy xong
       → ask_question gọi interrupt() → sub-graph dừng
  3. Trả về current_step = "interviewing"
```

---

### Interview Sub-Graph

```
[START]
   │
   ▼
┌──────────────────┐
│ generate_first   │  ← LLM tạo câu hỏi opening phù hợp với vị trí/công ty
└────────┬─────────┘
         │
         ▼
┌──────────────────┐ ◄─────────────────────────────────┐
│   ask_question   │  ← INTERRUPT: chờ người dùng trả lời │
└────────┬─────────┘                                   │
         │                                             │
         │  ── POST /agent/interview/answer { answer } │
         │                                             │
         ▼                                             │
┌──────────────────┐                                   │
│  save_and_next   │  ← Lưu Q&A, tạo câu hỏi tiếp     │
└────────┬─────────┘                                   │
         │                                             │
    ┌────┴─────┐                                       │
    │          │                                       │
!is_done    is_done                                    │
    │          │                                       │
    └──────────┼───────────────────────────────────────┘
               │
               ▼
    ┌──────────────────┐
    │   evaluate_all   │  ← LLM chấm điểm toàn bộ 5 câu trong 1 lần gọi
    └────────┬─────────┘
             │
             ▼
           [END]
```

#### Sub-Node `generate_first_question`

```
Input:  cv_data.target_position, cv_data.skills, selected_job.title, company_research.company_name

Xử lý:
  → Gọi LLM với FIRST_QUESTION_PROMPT (temperature=0.6)
  → Parse JSON: { round: "opening", question: "..." }

Output: current_question, current_round="opening", current_index=0
```

#### Sub-Node `ask_question`

```
Xử lý:
  → Gọi interrupt({ current_index, total, round, question })
  → Sub-graph dừng hoàn toàn, chờ user gửi câu trả lời
  → FE gọi POST /agent/interview/answer { answer }
  → Sub-graph resume từ save_and_next với current_answer được set

Output: current_answer (sau resume)
```

#### Sub-Node `save_and_next`

```
Input:  current_question, current_answer, current_index, qa_pairs (history),
        company_research.tech_stack

Xử lý:
  1. Tạo QAPair { index, round, question, answer } → append vào qa_pairs
  2. next_index = current_index + 1
  3. Nếu next_index >= max_questions (5):
       → is_done = true → route sang evaluate_all
  4. Nếu chưa đủ câu:
       → Gọi LLM với NEXT_QUESTION_PROMPT:
           - Phân tích chất lượng câu trả lời trước
           - Tốt → đào sâu hơn; Yếu → chuyển chủ đề
           - Xoay vòng: technical → behavior → culture_fit
       → is_done = false → route lại sang ask_question

Output: qa_pairs (appended), current_question, current_round, is_done
```

#### Sub-Node `evaluate_all`

```
Input:  qa_pairs (5 cặp đầy đủ), cv_data, selected_job

Xử lý:
  1. Format toàn bộ Q&A thành text
  2. Gọi LLM với EVALUATE_ALL_PROMPT (1 lần duy nhất):
       → evaluated[]: { index, score(0-10), feedback, suggestion }
       → summary: { total_score(0-100), level, overall_feedback,
                    strengths[], weaknesses[], recommendation }
  3. Merge score/feedback vào từng qa_pair
  4. Cập nhật main AgentState: current_step="interview_done"

Output: evaluated[], summary, current_step="interview_done"

Levels: Tốt (≥80) | Khá (60-79) | Trung bình (40-59) | Yếu (<40)
```

---

### Quản lý State

| Nơi lưu                       | Lưu gì                                          | Mục đích                                                     |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| **PostgresSaver** (LangGraph) | Toàn bộ `AgentState` + `InterviewState`         | Nguồn sự thật duy nhất — cho phép resume chính xác sau crash |
| **Redis**                     | `{ user_id, cv_id }` metadata                   | Kiểm tra session còn active (TTL 24h), tiến trình real-time  |
| **PostgreSQL**                | `AgentSession`, `InterviewQAPair`, `CVDocument` | Lịch sử dài hạn, hiển thị history                            |

---

## 4. API Endpoints

Base URL: `/api/v1`

---

### Auth — Xác thực

| Method | Endpoint         | Mô tả                                                        |
| ------ | ---------------- | ------------------------------------------------------------ |
| `POST` | `/auth/register` | Đăng ký tài khoản. Body: `{ email, password, full_name }`    |
| `POST` | `/auth/login`    | Đăng nhập (form OAuth2). Trả về access token + refresh token |
| `POST` | `/auth/refresh`  | Làm mới access token. Body: `{ refresh_token }`              |
| `GET`  | `/auth/me`       | Lấy thông tin người dùng đang đăng nhập                      |
| `GET`  | `/auth/ping`     | Health check endpoint                                        |

---

### CV — Quản lý CV

| Method | Endpoint                | Mô tả                                                                                                                                              |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `POST` | `/cv/upload`            | Upload file CV (PDF/DOCX). Tự động trích xuất text, phân tích bằng LLM, phát hiện trùng lặp qua SHA-256 hash. Trả về `is_duplicate=true` nếu trùng |
| `POST` | `/cv/duplicate/confirm` | Xác nhận hành động khi CV trùng. Body: `{ existing_cv_id, confirm: true                                                                            | false }`—`true`= tái sử dụng CV cũ,`false` = tạo mới |

---

### Agent — Điều phối workflow AI

| Method | Endpoint                      | Mô tả                                                                                                                                                                  |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/agent/start`                | Khởi tạo phiên làm việc mới với CV đã chọn. Inject initial state vào LangGraph checkpointer. Trả về `session_id`. Nếu đã có phiên trước với cùng CV thì `cached=true`  |
| `GET`  | `/agent/run/{session_id}`     | Kích hoạt chạy graph từ bước hiện tại trong background. Gọi sau `start` hoặc sau mỗi `resume`                                                                          |
| `GET`  | `/agent/session/{session_id}` | Poll trạng thái phiên: `current_step`, danh sách job, nghiên cứu công ty, câu hỏi phỏng vấn hiện tại, tiến trình                                                       |
| `POST` | `/agent/resume`               | Tiếp tục workflow sau khi graph bị interrupt. Dùng cho HITL #1: `{ session_id, company_name, job_selected }` hoặc HITL #2: `{ session_id, is_interview: true\|false }` |

**Luồng gọi agent chuẩn:**

```
POST /agent/start
  → GET /agent/run/{id}
  → polling GET /agent/session/{id}  (đến khi current_step = "jobs_found")

POST /agent/resume { company_name }          ← HITL #1
  → GET /agent/run/{id}
  → polling GET /agent/session/{id}  (đến khi current_step = "companies_researched")

POST /agent/resume { is_interview: true }    ← HITL #2
  → GET /agent/run/{id}
  → polling GET /agent/session/{id}  (đến khi current_step = "interviewing")

POST /agent/interview/answer × 5            ← Vòng phỏng vấn
```

---

### Interview — Phỏng vấn

| Method | Endpoint                  | Mô tả                                                                                                                            |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/agent/interview/answer` | Gửi câu trả lời cho câu hỏi hiện tại. Body: `{ session_id, answer }`. Trả về câu hỏi tiếp theo hoặc kết quả cuối nếu đã đủ 5 câu |
| `GET`  | `/agent/interview/result` | Lấy kết quả toàn bộ buổi phỏng vấn: điểm từng câu, tổng điểm, đánh giá tổng thể, gợi ý cải thiện                                 |

**Response của `/interview/answer` (chưa xong):**

```json
{
  "answered_index": 1,
  "total_questions": 5,
  "is_done": false,
  "next_question": {
    "index": 2,
    "round": "technical",
    "question": "...",
    "is_last": false
  }
}
```

**Response của `/interview/answer` (câu cuối):**

```json
{
  "answered_index": 4,
  "total_questions": 5,
  "is_done": true,
  "evaluated": [{ "index": 0, "score": 8, "feedback": "...", "suggestion": "..." }, ...],
  "summary": {
    "total_score": 76,
    "level": "Khá",
    "overall_feedback": "...",
    "strengths": [...],
    "weaknesses": [...],
    "recommendation": "..."
  }
}
```

---

### History — Lịch sử

| Method | Endpoint                 | Mô tả                                                                                       |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------- |
| `GET`  | `/history/list`          | Danh sách các phiên làm việc của người dùng, có phân trang và lọc theo trạng thái           |
| `GET`  | `/history/id`            | Lấy history theo `history_id` (query param)                                                 |
| `GET`  | `/history/{id}`          | Chi tiết một phiên: job đã chọn, nghiên cứu công ty, kết quả phỏng vấn, flag `can_continue` |
| `POST` | `/history/{id}/continue` | Tiếp tục một phiên đã bị gián đoạn trước đó                                                 |

---

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

1

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
