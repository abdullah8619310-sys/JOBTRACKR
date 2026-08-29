# JobTrackr

AI-Assisted Job Application Tracker & Follow-up Assistant — Arbisoft AI-Focused Internship 2026, Web Track, Phase 3 project.

> **Status: Week 5 (backend + basic frontend scaffold). No AI features are implemented yet.**
> This README documents exactly what exists in the repository today. See [Current Limitations](#current-limitations--not-yet-implemented) for what is intentionally deferred.

## Current Project Status / Scope

JobTrackr currently implements the **non-AI foundation** of the approved Phase 3 proposal:

- A PostgreSQL-backed `JobApplication` resource with full CRUD, built with Express and Prisma.
- Input validation on every write endpoint using Zod, with centralized, consistent error responses.
- A small React (Vite) frontend that lists, adds, views, edits, and deletes applications against that API.
- Automated tests for both backend (Vitest + Supertest) and frontend (Vitest + React Testing Library).

The two AI agents described in the Phase 3 proposal (Resume Reviewer Agent, Follow-up Agent) are **not built yet** — they are a later milestone. Nothing in this repository calls the Anthropic Claude API or OpenRouter today.

## Architecture Overview

Two independent npm projects in one repository: an Express API backed by PostgreSQL via Prisma, and a Vite/React single-page app that talks to it over plain HTTP/JSON. There is no shared code between them and no server-side rendering — the frontend is a static bundle served by Vite's dev server (or, in production, any static host) that calls the backend directly.

```
┌───────────────────────────┐         HTTP/JSON (fetch)          ┌────────────────────────────┐
│   React Frontend (Vite)    │ ─────────────────────────────────▶│   Express Backend (Node.js)  │
│   http://localhost:5173    │                                    │   http://localhost:3000       │
│                             │◀───────────────────────────────── │                                │
│  App.jsx                   │      JSON responses / errors      │  routes → controllers          │
│   ├─ ApplicationList        │                                    │   → Zod validators             │
│   ├─ ApplicationForm        │                                    │   → Prisma Client               │
│   └─ ApplicationDetails     │                                    └───────────────┬────────────────┘
│  src/api/applicationsApi.js │                                                    │
└───────────────────────────┘                                                     │ SQL (via Prisma)
                                                                                    ▼
                                                                        ┌────────────────────────┐
                                                                        │   PostgreSQL 17          │
                                                                        │   database: jobtrackr    │
                                                                        │   table: JobApplication  │
                                                                        └────────────────────────┘
```

Request flow for every write (`POST` / `PUT` / `DELETE`): **route → Zod schema validation → controller → Prisma Client → PostgreSQL**, with a single `errorHandler` middleware translating Zod errors, known Prisma errors, and application errors into consistent JSON responses.

## Folder / Project Structure

```
JOBTRACKR/
├── README.md
├── prompts.md
├── .gitignore
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # JobApplication model + ApplicationStatus enum
│   │   └── migrations/             # applied migration history
│   ├── src/
│   │   ├── app.js                  # Express app (no .listen) — importable by tests
│   │   ├── server.js               # entrypoint, calls app.listen
│   │   ├── config/env.js           # Zod-validated environment variables
│   │   ├── lib/prisma.js           # singleton PrismaClient
│   │   ├── routes/                 # /api/health, /api/applications
│   │   ├── controllers/applications.controller.js
│   │   ├── validators/applications.validator.js
│   │   ├── middleware/{notFound,errorHandler}.js
│   │   └── utils/AppError.js
│   ├── tests/{health,applications}.test.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                 # top-level state/orchestration
    │   ├── api/{httpClient,applicationsApi}.js
    │   ├── components/{ApplicationList,ApplicationForm,ApplicationDetails}.jsx
    │   ├── constants.js             # mirrors backend ApplicationStatus enum
    │   └── test/setup.js
    ├── .env.example
    └── package.json
```

## Tech Stack & Why

| Layer | Choice | Why |
|---|---|---|
| Backend framework | Express 5 | Matches the approved proposal; Express 5 auto-forwards rejected async handlers to error middleware, removing try/catch boilerplate from every controller. |
| ORM | Prisma 6 (`prisma` + `@prisma/client`, pinned to `6.19.3`) | Matches the approved proposal. Pinned deliberately below the newly-released Prisma 7, which removes `datasource url` from `schema.prisma` in favor of a `prisma.config.ts` + driver-adapter setup — a heavier, less standard pattern not assumed by the proposal or a typical review. |
| Database | PostgreSQL | Matches the approved proposal. |
| Validation | Zod 4 | Matches the approved proposal; used for both request bodies and (later) AI structured outputs. |
| Backend tests | Vitest + Supertest | Vitest for a fast, modern runner; Supertest to exercise the Express app directly (`app.js` exports the app without `.listen()` specifically so tests can import it). |
| Frontend framework | React 19 (Vite 8) | Matches the approved proposal; Vite gives fast local dev and a simple, standard React (JS) template. |
| Frontend tests | Vitest + React Testing Library + jsdom | Same test runner family as the backend for consistency; RTL for behavior-driven component tests per the proposal's "React Testing Library" requirement. |

## API Overview (Currently Implemented)

Base URL: `http://localhost:3000`. All request/response bodies are JSON.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/api/health` | — | `200` `{ status: "ok", timestamp }` | Liveness check. |
| POST | `/api/applications` | `{ company, role, status?, dateApplied, resumeVersion, jobDescription }` | `201` created record | `status` defaults to `APPLIED` if omitted. |
| GET | `/api/applications` | — | `200` array of records | Ordered by `createdAt` descending. |
| GET | `/api/applications/:id` | — | `200` record / `404` | |
| PUT | `/api/applications/:id` | any non-empty subset of the create fields | `200` updated record / `400` / `404` | An empty body (`{}`) is rejected with `400` by design. |
| DELETE | `/api/applications/:id` | — | `204` / `404` | |

`status` must be one of: `APPLIED`, `INTERVIEWING`, `OFFER`, `REJECTED`, `WITHDRAWN`.

Error shape (all non-2xx responses):
```json
{ "error": "ValidationError", "message": "Request validation failed", "details": [{ "path": "company", "message": "company is required" }] }
```

## Running Locally

### Backend

```bash
cd backend
npm install
# copy backend/.env.example to backend/.env and fill in your own local DATABASE_URL
npm run prisma:migrate   # applies prisma/migrations against your database
npm run dev              # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
# copy frontend/.env.example to frontend/.env (default already points at localhost:3000)
npm run dev               # http://localhost:5173
```

The backend must be running for the frontend to load any data — CORS is open on the backend for local development.

## Environment Variables

No real secrets are committed anywhere in this repository; both `.env` files are git-ignored and only `.env.example` (placeholder values) is tracked.

**`backend/.env.example`**
```
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/jobtrackr?schema=public"
```

**`frontend/.env.example`**
```
VITE_API_BASE_URL=http://localhost:3000
```

## Testing

```bash
cd backend && npm test     # Vitest + Supertest
cd frontend && npm test    # Vitest + React Testing Library
```

**Current status (last verified locally): backend 10/10 passing, frontend 12/12 passing.**

- Backend tests cover: health check, request validation (create + the empty-update-body rejection), full create → list → get → update → delete lifecycle, and 404s for missing resources.
- Frontend tests cover: list loading/empty/error/populated states, the add-application form submission, and an App-level integration suite (loading, render, error, add-then-refresh, delete-then-refresh) with the API layer mocked.

## Current Limitations / Not Yet Implemented

Intentionally out of scope for this milestone (per the approved proposal's phased plan and the mentor's "backend first, then a simple frontend" instruction):

- **No AI features.** No Resume Reviewer Agent, no Follow-up Agent, no Claude API or OpenRouter integration exists yet.
- **No authentication or authorization.** All applications are globally readable/writable; there is no concept of a logged-in user.
- **No dashboard, charts, or analytics.**
- **No job-board scraping or external job data integration** — all application data is user-entered.
- **No automatic email sending** — the future Follow-up Agent will only ever draft messages, never send them.
- **No pagination or filtering** on `GET /api/applications` — it returns the full list.
- **No production deployment** — both apps currently run locally only.

## Model Selection Rationale

**Not applicable yet.** No LLM or AI model has been integrated into JobTrackr at this stage of the build — the current milestone is the non-AI CRUD foundation (backend API + basic frontend) only. Model selection (Anthropic Claude API for the Resume Reviewer Agent, and a second OpenRouter-hosted model for the Follow-up Agent, per the approved Phase 3 proposal) is deferred until the Agentic AI implementation milestone (Week 6 onward) and will be documented here once that work begins.
