# JobTrackr

AI-Assisted Job Application Tracker & Follow-up Assistant — Arbisoft AI-Focused Internship 2026, Web Track, Phase 3 project.

> **Status: Week 6 — Resume Reviewer Agent implemented. Follow-up Agent is not built yet.**
> This README documents exactly what exists in the repository today. See [Current Limitations](#current-limitations--not-yet-implemented) for what is intentionally deferred.

## Current Project Status / Scope

JobTrackr currently implements:

- A PostgreSQL-backed `JobApplication` resource with full CRUD, built with Express and Prisma, including a persisted `resumeText` field.
- Input validation on every write endpoint using Zod, with centralized, consistent error responses.
- **The Resume Reviewer Agent**: a real, working AI feature. `POST /api/applications/:id/analyze` sends the application's `resumeText` and `jobDescription` to the Anthropic Claude API via structured function calling, validates the response with Zod, and returns a match score, missing keywords, and 2-3 improvement suggestions.
- A React (Vite) frontend that lists, adds, views, edits, and deletes applications, and includes an "Analyze Fit" button that calls the Resume Reviewer Agent and displays its results.
- Automated tests for both backend (Vitest + Supertest) and frontend (Vitest + React Testing Library), with the Anthropic API fully mocked in all automated tests — no automated test makes a real network call.

The second AI agent described in the Phase 3 proposal (the **Follow-up Agent**, using a second, OpenRouter-hosted model) is **not built yet** — that remains a later milestone.

## Architecture Overview

Two independent npm projects in one repository: an Express API backed by PostgreSQL via Prisma, and a Vite/React single-page app that talks to it over plain HTTP/JSON. There is no shared code between them and no server-side rendering — the frontend is a static bundle served by Vite's dev server (or, in production, any static host) that calls the backend directly.

```
┌────────────────────────┐   HTTP/JSON (fetch)   ┌─────────────────────────┐
│  React Frontend (Vite)  │ ────────────────────▶ │  Express Backend         │
│  http://localhost:5173  │ ◀──────────────────── │  http://localhost:3000   │
│                          │  JSON / errors        │  routes → controllers   │
│  App.jsx                │                       │   → Zod validators      │
│   ├─ ApplicationList     │                       │   → Prisma Client       │
│   ├─ ApplicationForm     │                       └────────┬────────┬───────┘
│   └─ ApplicationDetails  │                                │        │
│      (Analyze Fit button)│                    CRUD reads/ │        │ POST /:id/analyze
│  src/api/applicationsApi │                    writes only │        │ only
└────────────────────────┘                                 ▼        ▼
                                              ┌───────────────────┐  ┌──────────────────────┐
                                              │  PostgreSQL 17     │  │  backend/src/ai/       │
                                              │  db: jobtrackr     │  │  toolRegistry          │
                                              │  table: JobApplication│  → resume_review skill │
                                              └───────────────────┘  │  → AnthropicModelClient │
                                                                      └───────────┬───────────┘
                                                                                  │ HTTPS
                                                                                  ▼
                                                                      ┌──────────────────────┐
                                                                      │  Anthropic Claude API  │
                                                                      │  (external, real net) │
                                                                      └──────────────────────┘
```

Request flow for every CRUD write (`POST` / `PUT` / `DELETE` on `/api/applications`): **route → Zod schema validation → controller → Prisma Client → PostgreSQL**, with a single `errorHandler` middleware translating Zod errors, known Prisma errors, and application errors into consistent JSON responses.

Request flow for the AI endpoint (`POST /api/applications/:id/analyze`): **route → controller (fetch application, guard for missing resume text / missing API key) → logging hook → `resume_review` skill (from the `ToolRegistry`) → `AnthropicModelClient.generate()` (Claude tool-use call) → Zod-validated structured output → JSON response.** The AI layer never queries the database directly — the controller fetches the record and passes only `resumeText`/`jobDescription` into the skill.

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
│   │   ├── controllers/applications.controller.js   # includes analyzeApplication
│   │   ├── validators/{applications,resumeReview}.validator.js
│   │   ├── middleware/{notFound,errorHandler}.js
│   │   ├── utils/AppError.js
│   │   └── ai/
│   │       ├── toolRegistry.js       # ToolRegistry — register/get/has/list/clear
│   │       ├── modelClient.js        # ModelClient — base interface, still a stub
│   │       ├── agentRunner.js        # AgentRunner — still a stub, unused (see below)
│   │       ├── hooks.js              # withLogging — logs every skill call
│   │       ├── registry.js           # shared ToolRegistry instance; registers resume_review
│   │       ├── errors.js             # NotImplementedError
│   │       ├── index.js              # barrel export
│   │       ├── clients/anthropicModelClient.js   # real ModelClient implementation (Claude)
│   │       └── skills/resumeReview.js            # the resume_review skill
│   ├── tests/{health,applications,ai,hooks,resumeReview,analyze,analyzeNotConfigured}.test.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                 # top-level state/orchestration
    │   ├── api/{httpClient,applicationsApi}.js   # includes analyzeApplication
    │   ├── components/{ApplicationList,ApplicationForm,ApplicationDetails}.jsx
    │   ├── constants.js             # mirrors backend ApplicationStatus enum
    │   └── test/setup.js
    ├── .env.example
    └── package.json
```

## Resume Reviewer Agent (AI Integration)

The Resume Reviewer Agent is a real, working feature — not a stub. It follows the Phase 2 agent primitives from the approved proposal:

- **Skill/tool registration**: `backend/src/ai/skills/resumeReview.js` exports the `resume_review` skill, registered by name in the shared `ToolRegistry` (`backend/src/ai/registry.js`). The controller looks it up by name (`toolRegistry.get('resume_review')`) rather than calling it directly.
- **Function calling, not free-form chat**: `AnthropicModelClient` (`backend/src/ai/clients/anthropicModelClient.js`) calls the Claude API using **tool use** — the model is forced (`tool_choice`) to call a `submit_resume_review` tool with structured arguments, never a plain chat completion.
- **Structured output validation**: the skill validates the model's tool-call arguments against `resumeReviewOutputSchema` (`backend/src/validators/resumeReview.validator.js`) — `matchScore` (0-100), `missingKeywords` (string array), `suggestions` (2-3 strings). Malformed output is rejected with a clear `502` error, never silently passed through.
- **Logging hook**: `withLogging` (`backend/src/ai/hooks.js`) wraps every skill invocation and logs `{ agentName, timestamp, inputSize, success }` (and the error message on failure) — satisfying the proposal's transparency requirement.
- **No `AgentRunner`, no memory store, by design**: this is a single-shot, stateless call (resume + job description in, structured JSON out). `AgentRunner` remains an unused stub reserved for a genuinely multi-step agent later — forcing it into this flow would add complexity with no behavioral benefit. There's no separate memory layer either; the resume/job-description text injected into the one prompt is the only context this call needs, and memory was never one of the four primitives committed to in the approved proposal.
- **Never auto-applied**: the endpoint only returns suggestions in the HTTP response. Nothing in this codebase modifies the resume or auto-sends anything.

## Tech Stack & Why

| Layer | Choice | Why |
|---|---|---|
| Backend framework | Express 5 | Matches the approved proposal; Express 5 auto-forwards rejected async handlers to error middleware, removing try/catch boilerplate from every controller. |
| ORM | Prisma 6 (`prisma` + `@prisma/client`, pinned to `6.19.3`) | Matches the approved proposal. Pinned deliberately below the newly-released Prisma 7, which removes `datasource url` from `schema.prisma` in favor of a `prisma.config.ts` + driver-adapter setup — a heavier, less standard pattern not assumed by the proposal or a typical review. |
| Database | PostgreSQL | Matches the approved proposal. |
| Validation | Zod 4 | Matches the approved proposal; used for both request bodies and the AI agent's structured output. |
| Resume Reviewer Agent | Anthropic Claude API (`@anthropic-ai/sdk` `0.122.0`, model `claude-sonnet-5`), tool use / function calling | Matches the approved proposal ("Anthropic Claude API — strong at structured semantic text analysis"). Tool use forces a structured response instead of free-form chat. |
| Backend tests | Vitest + Supertest | Vitest for a fast, modern runner; Supertest to exercise the Express app directly (`app.js` exports the app without `.listen()` specifically so tests can import it). The Anthropic API is always mocked — see [Testing](#testing). |
| Frontend framework | React 19 (Vite 8) | Matches the approved proposal; Vite gives fast local dev and a simple, standard React (JS) template. |
| Frontend tests | Vitest + React Testing Library + jsdom | Same test runner family as the backend for consistency; RTL for behavior-driven component tests per the proposal's "React Testing Library" requirement. |

## API Overview (Currently Implemented)

Base URL: `http://localhost:3000`. All request/response bodies are JSON.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/api/health` | — | `200` `{ status: "ok", timestamp }` | Liveness check. |
| POST | `/api/applications` | `{ company, role, status?, dateApplied, resumeVersion, resumeText, jobDescription }` | `201` created record | `status` defaults to `APPLIED` if omitted. |
| GET | `/api/applications` | — | `200` array of records | Ordered by `createdAt` descending. |
| GET | `/api/applications/:id` | — | `200` record / `404` | |
| PUT | `/api/applications/:id` | any non-empty subset of the create fields | `200` updated record / `400` / `404` | An empty body (`{}`) is rejected with `400` by design. |
| DELETE | `/api/applications/:id` | — | `204` / `404` | |
| POST | `/api/applications/:id/analyze` | — (no body) | `200` `{ matchScore, missingKeywords, suggestions }` | Runs the Resume Reviewer Agent. See failure modes below. |

`status` must be one of: `APPLIED`, `INTERVIEWING`, `OFFER`, `REJECTED`, `WITHDRAWN`. `resumeText` is required on create; it's nullable at the database level only so pre-existing rows aren't broken by the migration that added it.

**`POST /:id/analyze` failure modes:**

| Status | Cause |
|---|---|
| `404` | Application does not exist. |
| `422` | Application exists but has no `resumeText` saved. |
| `503` | Server has no `ANTHROPIC_API_KEY` configured. |
| `502` | The Anthropic API call failed, or it returned output that failed Zod validation. |

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

# Optional. Only required to use the Resume Reviewer Agent (Anthropic Claude API).
# The app and all CRUD functionality work fine with this left unset.
# ANTHROPIC_API_KEY=your-anthropic-api-key
```

`ANTHROPIC_API_KEY` is validated as **optional** in `config/env.js` on purpose — the server and every CRUD test must keep working with no key configured. Only `POST /api/applications/:id/analyze` requires it, and it fails cleanly with `503` at call time if it's missing, rather than blocking the whole app from starting.

**`frontend/.env.example`**
```
VITE_API_BASE_URL=http://localhost:3000
```

## Testing

```bash
cd backend && npm test     # Vitest + Supertest
cd frontend && npm test    # Vitest + React Testing Library
```

**Current status (last verified locally): backend 35/35 passing, frontend 19/19 passing.**

**The Anthropic API is never called for real during automated tests.** `resumeReview.test.js` and `hooks.test.js` inject a fake `modelClient`; `analyze.test.js` and `analyzeNotConfigured.test.js` replace `AnthropicModelClient` on the shared `backend/src/ai` module object with a mock class before any request is made (a plain Node module-cache technique, chosen after confirming `vi.mock` does not reliably intercept a plain CommonJS `require()` chain in this project — an earlier attempt at mocking the SDK this way was caught making a real network call, which is exactly what this approach prevents). A real Anthropic API key is only ever used for manual/demo verification, never in `npm test`.

- **Backend tests** (35): the original 19 CRUD/health tests, plus:
  - `resumeReview.test.js` — the skill's success path, prompt construction, missing-model-client guard, and malformed-output/out-of-range/too-few-suggestions rejections, and that a model/API failure propagates rather than being swallowed.
  - `hooks.test.js` — `withLogging` logs a structured success entry and return value, and a structured failure entry while still re-throwing the original error.
  - `ai.test.js` — (existing file) now also asserts `resume_review` is actually registered on the shared `toolRegistry`.
  - `analyze.test.js` — the full `POST /:id/analyze` route: 404 (no application), 422 (no resume text), 502 (model failure), 502 (malformed output), 200 (success), all against the real Express app + real database, with only the Anthropic client mocked.
  - `analyzeNotConfigured.test.js` — 503 when `ANTHROPIC_API_KEY` is entirely unset, in its own file for module-registry isolation from the other analyze tests.
- **Frontend tests** (19): the original 12, plus `ApplicationDetails.test.jsx` (new — rendering, the Analyze Fit button, the analyzing/result/error states) and two new `App.test.jsx` cases (the full view → analyze → see-result flow, and an analyze-failure case), all with `applicationsApi` mocked.

## Current Limitations / Not Yet Implemented

Intentionally out of scope for this milestone:

- **No Follow-up Agent yet.** The second AI agent (stale-application detection + draft follow-up emails via a second, OpenRouter-hosted model) is a later milestone. `AgentRunner` remains an unused stub, reserved for whenever a genuinely multi-step agent is needed.
- **No persisted analysis history.** `POST /:id/analyze` returns its result directly in the HTTP response; nothing is written back to the `JobApplication` row. Re-running analysis always calls the model again.
- **No memory layer.** The Resume Reviewer Agent is a single-shot, stateless call by design — this matches the approved proposal, which never committed to a memory primitive for this feature.
- **No authentication or authorization.** All applications are globally readable/writable; there is no concept of a logged-in user.
- **No dashboard, charts, or analytics.**
- **No job-board scraping or external job data integration** — all application data is user-entered.
- **No automatic email sending or auto-applying.** The agent only ever returns suggestions in an API response; nothing is sent or modified automatically, now or later.
- **No pagination or filtering** on `GET /api/applications` — it returns the full list.
- **No production deployment** — both apps currently run locally only.

## Model Selection Rationale

**Resume Reviewer Agent → Anthropic Claude (`claude-sonnet-5`), via `@anthropic-ai/sdk`.** Chosen per the approved proposal ("strong at structured semantic text analysis"). Uses Claude's tool-use (function calling) feature specifically so the response is a schema-shaped object, not free text to be parsed — this is what makes the Zod validation step meaningful rather than a formality. The model name is read from `AnthropicModelClient`'s `model` option (defaulting to `claude-sonnet-5`) rather than hardcoded inline, so it can be updated without touching call sites.

**Follow-up Agent → still deferred.** Per the approved proposal this will use a second, OpenRouter-hosted model (to satisfy the ≥2-LLM-provider requirement) — that selection has not been made yet and will be documented here once that milestone starts.
