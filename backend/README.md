# Career Agent Backend

Backend cho hệ thống Career Agent — sử dụng **FastAPI**, **LangGraph**, **PostgreSQL** và **Redis**. Kiến trúc Clean Architecture, luồng xử lý đa bước với HITL (Human-in-the-Loop) và SSE streaming.

---

## Mục lục

1. [Kiến trúc hệ thống](#1-kiến-trúc-hệ-thống)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Agent Nodes](#3-agent-nodes)
4. [Luồng chạy API chi tiết](#4-luồng-chạy-api-chi-tiết)
5. [API Endpoints](#5-api-endpoints)
6. [Cài đặt & Chạy ứng dụng](#6-cài-đặt--chạy-ứng-dụng)
7. [Database & Migration](#7-database--migration)

---

## 1. Kiến trúc hệ thống

### 1.1 Tổng quan tầng

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│   FastAPI Controllers (agent, interview, cv, auth)          │
│   SSE StreamingResponse  │  REST JSON Endpoints             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Application Layer                         │
│   Interfaces (IAgentRepository, IInterviewRepository, ...)  │
│   DTOs / Request-Response models (Pydantic)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Infrastructure Layer                        │
│   AgentRepository  │  InterviewRepository  │  CVRepository  │
│   SessionService   │  LLMService           │  StreamService │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Orchestration Layer (LangGraph)             │
│   Main Graph: job_finder → company_researcher → interviewer │
│   Interview Sub-graph: generate → ask → save_next → eval    │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   PostgreSQL           Redis             External APIs
  (SQLAlchemy)     (session metadata)  (Gemini, Tavily)
  (LangGraph                           (Ollama fallback)
   Checkpointer)
```

### 1.2 Nguyên tắc quản lý state

| Nơi lưu | Lưu gì | Mục đích |
|---------|--------|---------|
| **PostgresSaver** (LangGraph) | Toàn bộ `AgentState` và `InterviewState` | Nguồn sự thật duy nhất — cho phép resume sau crash/F5 |
| **Redis** | `{ user_id, cv_id }` metadata | Kiểm tra session còn sống (TTL 24h) |
| **PostgreSQL** | `InterviewHistoryItem`, `CVDocument`, `User` | Lịch sử dài hạn |

> **Quy tắc:** Redis KHÔNG lưu `job_results`, `questions`, `cv_data`. Mọi state đọc từ `graph.get_state()`.

### 1.3 Sơ đồ luồng dữ liệu

```
POST /start
    └─► PostgresSaver ◄─── aupdate_state(initial_state)
    └─► Redis ◄──────────── save_metadata(user_id, cv_id)

GET /stream  ─► graph.astream_events(None, config)
                    └─► Tavily API ─► Gemini API ─► PostgresSaver (auto-checkpoint)
                    └─► SSE events ─────────────────────────────────────► FE

POST /resume ─► graph.aupdate_state(HITL input)  ← không chạy graph

GET /session ─► graph.get_state() + interview_graph.get_state() ─► merge ─► FE
```

---

## 2. Cấu trúc thư mục

```
src/
├── main.py                          # FastAPI entry point, lifespan setup
├── api/
│   ├── config/
│   │   ├── settings.py              # Pydantic settings từ .env
│   │   ├── redis_client.py          # Redis connection pool (singleton)
│   │   ├── checkpointer.py          # AsyncPostgresSaver setup
│   │   ├── security.py              # JWT (HS256), bcrypt
│   │   └── exceptions.py            # CareerAgentException
│   └── controller/
│       ├── agent.py                 # /agent/start, /stream, /resume, /session
│       ├── interview.py             # /interview/answer, /result, /history
│       ├── cv.py                    # /cv/upload
│       └── auth.py                  # /auth/register, /login, /refresh
│
├── core/
│   ├── domain/
│   │   └── models.py                # SQLAlchemy: User, CVDocument, InterviewHistoryItem
│   │
│   ├── application/
│   │   ├── repositories/            # Interfaces + DTOs
│   │   │   ├── agent_repo/          # IAgentRepository, agentdtos.py
│   │   │   ├── interview_repo/      # IInterviewRepository, interviewdtos.py
│   │   │   ├── cv_repo/
│   │   │   └── user_repo/
│   │   └── services/                # Service interfaces
│   │       ├── session_service/     # ISessionService
│   │       ├── llm_service/         # ILLMService
│   │       └── cv_service/          # ICVService
│   │
│   ├── infrastructure/
│   │   ├── persistence/session.py   # AsyncSessionFactory (SQLAlchemy)
│   │   ├── repositories/            # Concrete implementations
│   │   │   ├── agent_repo.py
│   │   │   ├── interview_repo.py
│   │   │   ├── cv_repo.py
│   │   │   └── user_repo.py
│   │   └── services/
│   │       ├── session_service.py   # Redis metadata storage
│   │       ├── llm_service.py       # Gemini / Ollama wrapper
│   │       ├── cv_service.py        # PDF/DOCX extraction
│   │       └── stream_service.py    # SSE generator (stream_graph_events)
│   │
│   └── orchestration/
│       ├── graphs/
│       │   ├── graph.py             # Main agent graph
│       │   └── interview_graph.py   # Interview sub-graph
│       ├── nodes/
│       │   ├── job_finder.py        # Tavily search + Gemini parse
│       │   ├── company_researcher.py# Tavily + Gemini research
│       │   └── interview_nodes.py   # generate, ask, save_next, eval_all, bridge
│       ├── state/
│       │   ├── state.py             # AgentState TypedDict
│       │   └── interview_state.py   # InterviewState, QAPair, QAEvaluated
│       └── prompts/                 # LLM prompt templates
│
└── migrations/                      # Alembic migrations
```

---

## 3. Agent Nodes

### 3.1 Main Graph

```
[START]
   │
   ▼
job_finder ──(interrupt_after)──► [HITL #1: user chọn công ty]
   │                                        │
   │                              POST /resume {company_name}
   │                                        │
   ▼                                        ▼
company_researcher ──(interrupt_after)──► [HITL #2: user chọn hành động]
   │                                        │
   │                              POST /resume {is_interview}
   │                                        │
   ├─ is_interview=false ──────────────► [END]
   │
   └─ is_interview=true
          │
          ▼
      interviewer ──────────────────────► [END]
```

---

#### Node 1 — `job_finder_node`

**File:** `src/core/orchestration/nodes/job_finder.py`

**Mục đích:** Tìm kiếm việc làm phù hợp với CV của ứng viên.

```
Input:  cv_data { target_position, skills, experience, education }
Output: job_results [ JobResult... ] — sorted by match_score DESC

Luồng:
  1. Xây search query từ cv_data
       → "{target_position} {top 3 skills} tuyển dụng 2026"

  2. Tavily.search(query, max_results=10, include_domains=[topcv, itviec, linkedin])
       → Lọc bỏ aggregator URLs (trang tổng hợp như /search, /tim-viec-lam)

  3. Tavily.extract(urls[:5])
       → Lấy full content từng trang job (tối đa 2000 chars/job)
       → Fallback về search.content nếu extract lỗi

  4. Gọi Gemini với JOB_FINDER_PROMPT
       → Extract: title, company, salary, location, requirements, benefits
       → Tính match_score (0-100) và match_reason dựa vào CV

  5. Sort jobs by match_score, set current_step = "jobs_found"
     → Graph bị interrupt ở đây (interrupt_after=["job_finder"])
```

**Cache guard:** Nếu `current_step` đã là `jobs_found/job_selected/companies_researched` → skip, không chạy lại.

---

#### Node 2 — `company_researcher_node`

**File:** `src/core/orchestration/nodes/company_researcher.py`

**Mục đích:** Research văn hóa, tech stack, quy trình phỏng vấn của công ty được chọn.

```
Input:  company_name (từ HITL #1) hoặc job_selected.company
        cv_data { target_position, skills }
Output: company_research { culture, tech_stack, interview_process, pros_cons, ... }
        job_selected (resolve từ job_results nếu chưa có)

Luồng:
  1. Xác định company_name:
       company_name = state["company_name"] OR state["job_selected"]["company"]

  2. Nếu job_selected chưa có → tìm trong job_results by company_name

  3. Tavily.search("{company} review culture interview process tech stack Vietnam IT")
       → max_results=5, ghép content (~1500 chars)

  4. Gọi Gemini với COMPANY_RESEARCH_PROMPT
       → Parse JSON: industry, size, culture, products, tech_stack,
                     interview_process, pros_cons

  5. Trả về company_research, job_selected, current_step = "companies_researched"
     → Graph bị interrupt (interrupt_after=["company_researcher"])
```

---

#### Node 3 — `interviewer_node` (Bridge)

**File:** `src/core/orchestration/nodes/interview_nodes.py`

**Mục đích:** Cầu nối main graph → interview sub-graph.

```
Input:  cv_data, job_selected, company_research, session_id từ AgentState
Output: current_step = "interviewing"

Luồng:
  1. Khởi tạo InterviewState { cv_data, selected_job, company_research,
                                session_id, user_id, cv_id, max_questions=5 }

  2. interview_graph.astream(initial_state, {thread_id: "{session_id}_interview"})
       → Chạy đến interrupt đầu tiên (sau ask_question)
       → generate_first_question_node chạy → ask_question_node gọi interrupt()

  3. Sub-graph dừng, main graph tiếp tục kết thúc
     → current_step = "interviewing"
```

---

### 3.2 Interview Sub-graph

```
[START]
   │
   ▼
generate_first ──────────────────────────────────────┐
   │                                                 │
   ▼                                                 │
ask_question ──(interrupt_after)──► [HITL: user trả lời]
   │                                        │
   │                           POST /interview/answer {answer}
   │                                        │
   ▼                                        ▼
save_and_next
   │
   ├─ is_done=false ──────────────► ask_question (loop)
   │
   └─ is_done=true
          │
          ▼
      evaluate_all ──────────────► [END]
```

---

#### Sub-Node 1 — `generate_first_question_node`

**Mục đích:** Tạo câu hỏi khai mạc (round = "opening").

```
Input:  cv_data, selected_job
Output: current_question, current_round="opening", current_index=0

Luồng:
  → Gọi Gemini với FIRST_QUESTION_PROMPT
     format: company_name, target_position, skills, job_title
  → Parse { question, round } từ JSON response
```

---

#### Sub-Node 2 — `ask_question_node`

**Mục đích:** Hiển thị câu hỏi và chờ user trả lời (LangGraph `interrupt()`).

```
Input:  current_question, current_round, current_index, max_questions
Output: current_answer (sau khi user trả lời qua /interview/answer)

Luồng:
  → Gọi interrupt({ current_index, total, round, question })
  → Sub-graph dừng hoàn toàn tại đây
  → FE gọi POST /interview/answer { answer }
  → sub_graph.aupdate_state({ current_answer: answer }, as_node="ask_question")
  → sub_graph.astream(None) resume từ save_and_next
```

---

#### Sub-Node 3 — `evaluate_and_next_node` (`save_and_next`)

**Mục đích:** Lưu Q&A pair và tạo câu hỏi tiếp theo.

```
Input:  current_question, current_answer, current_index, qa_pairs (history)
Output: qa_pairs += [new pair], current_question (câu tiếp), is_done

Luồng:
  1. Tạo QAPair { index, round, question, answer } — append vào qa_pairs
  2. next_index = current_index + 1
  3. Nếu next_index >= max_questions (5):
       → is_done = true → route sang evaluate_all
  4. Nếu chưa xong:
       → Gọi Gemini với NEXT_QUESTION_PROMPT
          context: lịch sử Q&A, tech_stack công ty, vị trí ứng tuyển
       → Parse { question, round } → current_question/round tiếp theo
       → is_done = false → route sang ask_question

Rounds tự động: opening → technical → behavior → culture_fit → ...
```

---

#### Sub-Node 4 — `evaluate_all_node`

**Mục đích:** Chấm điểm toàn bộ 5 câu hỏi trong 1 lần gọi LLM.

```
Input:  qa_pairs (5 cặp), cv_data, selected_job
Output: evaluated [ QAEvaluated... ], summary

Luồng:
  1. Format toàn bộ Q&A thành văn bản
  2. Gọi Gemini với EVALUATE_ALL_PROMPT
     → Parse: evaluated [ { index, score(0-10), feedback, suggestion } ]
              summary { total_score, level, overall_feedback, strengths,
                        weaknesses, recommendation }
  3. Tính total_score = avg(scores) * 10  (thang 100)
  4. Merge score/feedback/suggestion vào từng qa_pair
  5. Cập nhật main graph: current_step = "interview_done"
     Lưu evaluated + summary vào AgentState
```

---

## 4. Luồng chạy API chi tiết

### Bước 1 — Khởi tạo session

```
POST /api/v1/agent/start
Body: { "cv_id": "uuid", "refresh": false }

AgentRepository.start_agent():
  1. session_id = "agent_{user[:8]}_{cv[:8]}"
  2. refresh=false → graph.aget_state()
       → checkpoint tồn tại? → trả về { cached: true }
  3. Tải cv_data từ PostgreSQL
  4. graph.aupdate_state({ cv_data, cv_raw_text, current_step: "ready", ... })
     ↳ GHI vào PostgresSaver — KHÔNG chạy graph
  5. Redis.save_metadata(session_id, user_id, cv_id)  TTL=24h

Response: { "session_id": "agent_abc_xyz", "current_step": "ready", "cached": false }
```

---

### Bước 2 — Stream: Tìm việc

```
GET /api/v1/agent/stream/{session_id}  [SSE]

stream_graph_events():
  1. Redis.get_metadata() → None? → error event
  2. graph.aget_state() → state.next non-empty AND step in HITL? → restore event
  3. graph.astream_events(None, config, version="v2"):

     ┌─ on_chain_start [job_finder] ──────────────────► SSE: progress
     │
     ├─ on_chat_model_stream (Gemini tokens) ──────────► SSE: token × N
     │
     └─ on_chain_end [job_finder] ────────────────────► SSE: result

  4. graph.aget_state() → state.next non-empty (interrupted)
     current_step = "jobs_found"
     ──────────────────────────────────────────────────► SSE: hitl
                                                          { job_results: [...] }

SSE events:
  data: {"type":"progress","step":"job_finder","message":"Đang xử lý job_finder..."}
  data: {"type":"token","content":"Backend"}
  data: {"type":"token","content":" Developer"}
  ...
  data: {"type":"result","step":"job_finder","data":{"current_step":"jobs_found"}}
  data: {"type":"hitl","step":"jobs_found","data":{"job_results":[...]}}
```

---

### Bước 3 — HITL #1: Chọn công ty

```
POST /api/v1/agent/resume
Body: { "session_id": "agent_abc_xyz", "company_name": "FPT Software" }

AgentRepository.resume_agent():
  1. graph.aget_state() → current_step = "jobs_found"
  2. Tìm job_selected trong job_results by company == "FPT Software"
  3. graph.aupdate_state({
       company_name: "FPT Software",
       job_selected: { title, company, salary, ... },
       current_step: "job_selected"
     }, as_node="job_finder")
     ↳ Cập nhật checkpoint, đặt con trỏ resume tại job_finder
  4. KHÔNG chạy graph

Response: { "session_id": "...", "current_step": "job_selected",
            "message": "Kết nối SSE để tiếp tục" }
```

---

### Bước 4 — Stream: Research công ty

```
GET /api/v1/agent/stream/{session_id}  [SSE reconnect]

  graph.aget_state() → state.next = ["company_researcher"] → tiếp tục
  graph.astream_events(None, config):

     ┌─ progress [company_researcher]
     ├─ token × N  (Gemini research về FPT Software)
     └─ result [company_researcher]

  → interrupted (interrupt_after=["company_researcher"])
  → hitl event: { company_research: { culture, tech_stack, ... } }
```

---

### Bước 5 — HITL #2: Chọn hành động

```
POST /api/v1/agent/resume
Body: { "session_id": "...", "is_interview": true }

  graph.aupdate_state({
    is_interview: true,
    current_step: "action_selected"
  }, as_node="company_researcher")

Response: { "current_step": "action_selected", "message": "Kết nối SSE để tiếp tục" }
```

---

### Bước 6 — Stream: Bắt đầu phỏng vấn

```
GET /api/v1/agent/stream/{session_id}  [SSE reconnect]

  graph.astream_events(None, config):
     └─ interviewer_node():
          1. Khởi tạo InterviewState
          2. interview_graph.astream(initial, interview_config)
             → generate_first_question: Gemini tạo câu hỏi opening
             → ask_question: interrupt() — sub-graph dừng
          3. Trả về current_step = "interviewing"

  → main graph kết thúc (state.next empty sau interviewer)
  → hitl event: { current_question, current_round, current_index, max_questions }
```

---

### Bước 7 — Phỏng vấn (5 vòng)

```
POST /api/v1/agent/interview/answer
Body: { "session_id": "...", "answer": "Câu trả lời..." }

InterviewRepository.submit_answer():
  1. sub_graph.aget_state() → current_index=0, max_questions=5
  2. sub_graph.aupdate_state({ current_answer }, as_node="ask_question")
  3. sub_graph.astream(None):
       save_and_next:
         - Tạo QAPair, append vào qa_pairs
         - next_index < 5 → Gemini tạo câu hỏi tiếp
         - ask_question: interrupt()
  4. sub_graph.aget_state() → đọc state mới

Response (chưa xong):
{
  "answered_index": 0, "total_questions": 5, "is_done": false,
  "next_question": { "index": 1, "round": "technical",
                     "question": "...", "is_last": false }
}

─── Lặp lại 4 lần nữa ───

Response (câu cuối, index=4):
  save_and_next → is_done=true → evaluate_all:
    - Gemini chấm điểm cả 5 câu 1 lần
    - Tính total_score, level, feedback

  main graph.aupdate_state({ current_step: "interview_done", evaluated, summary })

{
  "answered_index": 4, "total_questions": 5, "is_done": true,
  "evaluated": [{ "index":0, "score":8, "feedback":"...", "suggestion":"..." }, ...],
  "summary": { "total_score": 76, "level": "Khá", "overall_feedback": "...",
               "strengths": [...], "weaknesses": [...], "recommendation": "..." }
}
```

---

### Restore sau F5

```
GET /api/v1/agent/session/{session_id}

AgentRepository.get_session_state():
  1. Redis.get_metadata() → None → 404
  2. graph.aget_state() → main state từ PostgresSaver
  3. Nếu step in ("interviewing", "interview_done"):
       interview_graph.aget_state() → merge dữ liệu phỏng vấn
  4. Trả về toàn bộ state

Response:
{
  "session_id": "...",
  "current_step": "interviewing",
  "job_results": [...],
  "company_research": {...},
  "selected_job": {...},
  "current_question": "...",
  "current_round": "technical",
  "current_question_index": 2,
  "max_questions": 5,
  "interview_qa_pairs": [...]
}
```

---

### Reconnect SSE tại HITL (restore event)

```
GET /api/v1/agent/stream/{session_id}

stream_graph_events():
  graph.aget_state() → state.next non-empty
                     AND current_step in HITL_STEPS
  → emit restore event (không chạy graph)

data: {
  "type": "restore",
  "step": "jobs_found",
  "state": { "job_results": [...], ... }
}
```

---

## 5. API Endpoints

### Agent

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/v1/agent/start` | Tạo session, inject state vào PostgresSaver |
| `GET`  | `/api/v1/agent/stream/{session_id}` | SSE — chạy graph, stream events |
| `POST` | `/api/v1/agent/resume` | Inject HITL input (company_name / is_interview) |
| `GET`  | `/api/v1/agent/session/{session_id}` | Restore state sau F5 |

### Interview

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/v1/agent/interview/answer` | Nộp câu trả lời phỏng vấn |
| `GET`  | `/api/v1/agent/interview/result` | Lấy kết quả sau khi xong |
| `GET`  | `/api/v1/agent/interview/history` | Danh sách lịch sử phỏng vấn |
| `GET`  | `/api/v1/agent/interview/history/{id}` | Chi tiết 1 buổi phỏng vấn |

### CV & Auth

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/v1/cv/upload` | Upload & parse CV (PDF/DOC/DOCX) |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/v1/auth/login` | Đăng nhập (access + refresh token) |
| `POST` | `/api/v1/auth/refresh` | Làm mới access token |
| `GET`  | `/api/v1/auth/me` | Thông tin user hiện tại |

### SSE Event Types

| Event | Fields | Ý nghĩa |
|-------|--------|---------|
| `progress` | `step`, `message` | Node bắt đầu chạy |
| `token` | `content` | LLM stream token |
| `result` | `step`, `data` | Node hoàn thành |
| `hitl` | `step`, `message`, `data` | Graph dừng, cần input |
| `restore` | `step`, `state` | Session đang ở HITL (F5 reconnect) |
| `error` | `message` | Lỗi |
| `done` | `step`, `message` | Graph chạy xong toàn bộ |

---

## 6. Cài đặt & Chạy ứng dụng

### Yêu cầu

- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- (Tuỳ chọn) Ollama cho LLM local

### Cấu hình `.env`

```env
# App
APP_NAME=career-agent
DEBUG=false

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/career_agent

# Redis
REDIS_URL=redis://localhost:6379

# LLM — chọn "gemini" hoặc "ollama"
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest

# Search
TAVILY_API_KEY=tvly-...

# Auth
SECRET_KEY=your_super_secret_key_min_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# File upload
MAX_UPLOAD_SIZE_MB=10
UPLOAD_DIR=uploads
```

### Cài đặt & chạy

```bash
# Cài dependencies
pip install -r requirements.txt

# Chạy migration
alembic upgrade head

# Khởi động server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Docs tự động: `http://localhost:8000/docs`

---

## 7. Database & Migration

### Models chính

| Table | Mô tả |
|-------|-------|
| `users` | Tài khoản người dùng |
| `cv_documents` | CV đã upload & parse (JSON) |
| `cv_usage_history` | Lịch sử sử dụng CV theo từng action |
| `interview_history_items` | Kết quả phỏng vấn (score, Q&A, summary) |

LangGraph tự tạo bảng `checkpoints`, `checkpoint_blobs`, `checkpoint_writes` khi khởi động.

### Alembic

```bash
# Tạo migration sau khi thay đổi models
alembic revision --autogenerate -m "mô tả thay đổi"

# Chạy migration
alembic upgrade head

# Rollback 1 bước
alembic downgrade -1

# Xem lịch sử
alembic history --verbose
```
