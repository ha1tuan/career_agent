# Career Agent — Frontend

## Mục tiêu

Xây dựng giao diện React cho hệ thống Career Agent AI.
Fake API (mock data) để dev độc lập với backend.

## Tech Stack

- React 18 + Vite
- TailwindCSS (styling)
- Zustand (state management)
- React Router v6 (routing)
- Axios (HTTP client)
- React Query (server state)

## Cấu trúc thư mục

frontend/
├── src/
│ ├── api/
│ │ ├── mock/ ← Fake API data
│ │ │ ├── auth.mock.js
│ │ │ └── agent.mock.js
│ │ ├── services/ ← Real API calls (sau này)
│ │ │ ├── auth.service.js
│ │ │ └── agent.service.js
│ │ └── index.js ← Switch mock/real bằng ENV
│ ├── components/
│ │ ├── ui/ ← Base components
│ │ ├── auth/ ← Login, Register forms
│ │ └── agent/ ← CV Upload, Job List, Interview...
│ ├── pages/
│ │ ├── LoginPage.jsx
│ │ ├── RegisterPage.jsx
│ │ ├── DashboardPage.jsx
│ │ ├── AgentPage.jsx
│ │ └── ResultPage.jsx
│ ├── stores/
│ │ ├── authStore.js ← Zustand auth state
│ │ └── agentStore.js ← Zustand agent state
│ ├── hooks/
│ │ └── useAgent.js
│ └── App.jsx
├── .env.development ← VITE_USE_MOCK=true
├── .env.production ← VITE_USE_MOCK=false
└── CLAUDE.md

## Mock API Strategy

Dùng biến môi trường để switch mock/real:

```javascript
// src/api/index.js
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
export const api = USE_MOCK ? mockApi : realApi;
```

Mock data phải realistic — dùng data từ backend test output.

## Flow màn hình

/login → /register
│
▼
/dashboard (danh sách sessions cũ)
│
▼
/agent/new (upload CV)
│
▼
/agent/:id/jobs (chọn job)
│
▼
/agent/:id/company (xem company intel)
│
▼
/agent/:id/choose (Interview hay CV Review?)
│
├── /agent/:id/interview (chat interface)
└── /agent/:id/cv-review (CV suggestions)

## Design System

- Font: Inter
- Primary color: #6366f1 (Indigo)
- Background: #0f172a (Dark slate)
- Card: #1e293b
- Text: #f1f5f9
- Success: #22c55e
- Warning: #f59e0b
- Error: #ef4444
- Border radius: 12px
- Shadow: subtle, dark theme

## Component Conventions

- Functional components + hooks only
- Props interface comment ở đầu mỗi component
- Loading state và Error state bắt buộc
- Responsive: mobile-first

## Mock Data Rules

- Delay 800-1500ms để simulate network
- 95% success rate (5% random error để test)
- Data phải match với backend schemas

## Screens cần build (theo thứ tự)

1. [ ] Login / Register
2. [ ] Dashboard
3. [ ] CV Upload + Parsing result
4. [ ] Job Listings (cards + selection)
5. [ ] Company Intel display
6. [ ] Choice screen (Interview vs CV Review)
7. [ ] Interview chat interface
8. [ ] CV Review + suggestions
9. [ ] Final results / feedback
