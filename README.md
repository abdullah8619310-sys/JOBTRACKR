# JobTrackr

AI-Assisted Job Application Tracker & Follow-up Assistant — Arbisoft AI-Focused Internship 2026, Web Track, Phase 3 project.

> **Status: Week 7 complete.** Resume Reviewer Agent, stale-application detection, Follow-up Agent, Groq + OpenRouter multi-model routing, live multi-model comparison, retry/reliability, an end-to-end test, local Docker containerization, and a database index are all implemented and passing. This README documents exactly what exists in the repository today — see [Known Limitations](#known-limitations) for what is intentionally deferred or not yet verified.

## Project Overview

Job hunting means tracking dozens of applications by hand and losing track of which ones need a nudge. JobTrackr is a small full-stack tool that solves that directly:

1. **Track** — store each application (company, role, status, dates, resume version, resume text, job description) in Postgres via a plain CRUD API.
2. **Review** — the **Resume Reviewer Agent** compares a saved resume against a saved job description and returns a match score, missing keywords, and concrete suggestions, so you know what to fix before you apply.
3. **Follow up** — once an application has gone quiet (no update after 7 days), it shows up in a **stale applications** list, and the **Follow-up Agent** drafts a short, editable follow-up email you can review, tweak, and send yourself — nothing is ever sent automatically.

Both AI features share one abstraction (`ModelClient`) and can run against either **Groq** or **OpenRouter**, selected by a single `AI_PROVIDER` switch — the rest of the app never knows or cares which provider is active.

## Main Features

- **Application CRUD** — create/list/view/update/delete, backed by Postgres + Prisma, validated with Zod.
- **Resume Reviewer Agent** — `POST /:id/analyze`, Groq/OpenRouter forced tool-calling, Zod-validated structured output.
- **Stale application detection** — `GET /stale`, a pure date-cutoff query (no AI call).
- **Follow-up Agent** — `POST /:id/follow-up`, drafts an editable `{subject, body}` email for a stale application only.
- **Multi-model provider routing** — `AI_PROVIDER=groq|openrouter`, no automatic fallback between them.
- **Live multi-model comparison** — `POST /:id/compare-models` sends the same resume-review task to Groq **and** OpenRouter independently and returns both results, labeled — separate from routing, see [Live Multi-Model Comparison](#live-multi-model-comparison).
- **Retry handling** — transient provider failures (429/5xx/connection errors) retried once; malformed output and non-transient errors are not.
- **Lightweight frontend** — React + Vite, no router, no state library, no build tooling beyond Vite's defaults.
- **End-to-end test** — one Supertest-driven test exercising the real stale-discovery → follow-up-draft pipeline, only the concrete `GroqModelClient` mocked.
- **Docker support** — a local Compose stack (Postgres + backend + nginx-served frontend) for a self-contained demo.

## Architecture Overview

Two independent npm projects in one repository: an Express API backed by PostgreSQL via Prisma, and a Vite/React single-page app that talks to it over plain HTTP/JSON. There is no shared code between them and no server-side rendering — the frontend is a static bundle served by Vite's dev server (or, via Docker, nginx) that calls the backend directly from the browser.

```
React Frontend (Vite)
      │  HTTP/JSON (fetch)
      ▼
Express REST API  (routes → controllers)
      │
      ├── CRUD reads/writes ──────────────▶ Prisma Client ──▶ PostgreSQL
      │
      └── AI endpoints (analyze / follow-up)
                │
                ▼
          ToolRegistry.get('resume_review' | 'draft_followup')
                │
                ▼
          AI Skill  (builds prompt, calls withRetry, validates output with Zod)
                │
                ▼
          ModelClient.generate()   ◀── ai.createModelClient() reads AI_PROVIDER
                │
        ┌───────┴───────┐
        ▼               ▼
  GroqModelClient   OpenRouterModelClient
        │               │
        ▼               ▼
     Groq API       OpenRouter API
  (external, real network calls — always mocked in automated tests)
```

Request flow for every CRUD write (`POST` / `PUT` / `DELETE` on `/api/applications`): **route → Zod schema validation → controller → Prisma Client → PostgreSQL**, with a single `errorHandler` middleware translating Zod errors, known Prisma errors, and application errors into consistent JSON responses.

Request flow for `GET /api/applications/stale`: **route → controller → `applications.service.js` (`findStaleApplications`, a pure date-cutoff Prisma query, no AI call) → PostgreSQL → JSON array.**

Request flow for both AI endpoints (`POST /:id/analyze`, `POST /:id/follow-up`): **route → controller (fetch application, guard for missing resume text / not-stale / missing API key) → logging hook (`withLogging`) → the matching skill (`resume_review` or `draft_followup`, looked up by name in the `ToolRegistry`) → `withRetry(() => modelClient.generate(...))` → Zod-validated structured output → JSON response.** `modelClient` itself comes from `ai.createModelClient()`, which reads `AI_PROVIDER` and returns either `GroqModelClient` or `OpenRouterModelClient` — the controller and both skills never reference a specific provider. The AI layer never queries the database directly — the controller fetches the record and passes only the fields each skill needs.

## Folder / Project Structure

```
JOBTRACKR/
├── README.md
├── prompts.md
├── docker-compose.yml               # local Postgres + backend + frontend stack
├── .env.example                     # Docker Compose-only env template
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── prisma/
│   │   ├── schema.prisma            # JobApplication model + ApplicationStatus enum + indexes
│   │   └── migrations/              # applied migration history (incl. add_date_applied_index)
│   ├── src/
│   │   ├── app.js                   # Express app (no .listen) — importable by tests
│   │   ├── server.js                # entrypoint, calls app.listen
│   │   ├── config/env.js            # Zod-validated environment variables
│   │   ├── lib/prisma.js            # singleton PrismaClient
│   │   ├── routes/                  # /api/health, /api/applications (incl. /stale, /:id/follow-up)
│   │   ├── controllers/applications.controller.js   # analyzeApplication, generateFollowUp, compareModels, listStaleApplications
│   │   ├── services/applications.service.js         # findStaleApplications, isApplicationStale
│   │   ├── validators/{applications,resumeReview,followUp}.validator.js
│   │   ├── middleware/{notFound,errorHandler}.js
│   │   ├── utils/AppError.js
│   │   └── ai/
│   │       ├── toolRegistry.js       # ToolRegistry — register/get/has/list/clear
│   │       ├── modelClient.js        # ModelClient — base interface
│   │       ├── agentRunner.js        # AgentRunner — still a stub, unused (see below)
│   │       ├── hooks.js              # withLogging — logs every skill call
│   │       ├── retry.js              # withRetry / isRetryableError — shared by both skills
│   │       ├── registry.js           # shared ToolRegistry instance; registers both skills
│   │       ├── errors.js             # NotImplementedError
│   │       ├── index.js              # createModelClient() — AI_PROVIDER routing, barrel export
│   │       ├── clients/{groqModelClient,openRouterModelClient}.js
│   │       └── skills/{resumeReview,followUp}.js
│   ├── tests/                        # 18 files — see Testing below
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf                    # serves the built SPA inside the frontend container
    ├── src/
    │   ├── App.jsx                   # top-level state/orchestration
    │   ├── api/{httpClient,applicationsApi}.js   # includes analyzeApplication, generateFollowUp, listStaleApplications
    │   ├── components/{ApplicationList,ApplicationForm,ApplicationDetails,StaleApplications}.jsx
    │   ├── constants.js               # mirrors backend ApplicationStatus enum
    │   └── test/setup.js
    ├── .env.example
    └── package.json
```

## Resume Reviewer Agent (AI Integration)

The Resume Reviewer Agent is a real, working feature — not a stub. It follows the Phase 2 agent primitives from the approved proposal:

- **Skill/tool registration**: `backend/src/ai/skills/resumeReview.js` exports the `resume_review` skill, registered by name in the shared `ToolRegistry` (`backend/src/ai/registry.js`). The controller looks it up by name (`toolRegistry.get('resume_review')`) rather than calling it directly.
- **Function calling, not free-form chat**: `GroqModelClient` (`backend/src/ai/clients/groqModelClient.js`) calls the Groq API (OpenAI-compatible Chat Completions) using **forced tool/function calling** — `tool_choice` is set to `{ type: 'function', function: { name: 'submit_resume_review' } }`, so the model is required to return structured arguments, never a plain chat completion. Groq returns those arguments as a JSON string (`message.tool_calls[0].function.arguments`), which the client parses before returning — a detail entirely internal to the client; the skill above it never sees the difference.
- **Structured output validation**: the skill validates the model's tool-call arguments against `resumeReviewOutputSchema` (`backend/src/validators/resumeReview.validator.js`) — `matchScore` (0-100), `missingKeywords` (string array), `suggestions` (2-3 strings). Malformed output is rejected with a clear `502` error, never silently passed through — there is no fabricated fallback result.
- **Retry on transient failures only** (`backend/src/ai/retry.js`, shared by both agents): if the provider call itself fails with a retryable error (HTTP 429, HTTP 5xx, or a connection/timeout failure) it's retried once — 2 attempts total, never more. Non-retryable failures (bad API key, bad request, invalid model) and a successfully-returned-but-malformed response are never retried; the latter fails Zod validation, not the network call, so retrying it wouldn't help and could hide a real prompt/schema bug.
- **Logging hook**: `withLogging` (`backend/src/ai/hooks.js`) wraps every skill invocation and logs `{ agentName, timestamp, inputSize, success }` (and the error message on failure) — satisfying the proposal's transparency requirement.
- **No `AgentRunner`, no memory store, by design**: this is a single-shot, stateless call (resume + job description in, structured JSON out). `AgentRunner` remains an unused stub reserved for a genuinely multi-step agent later — forcing it into this flow would add complexity with no behavioral benefit. There's no separate memory layer either; the resume/job-description text injected into the one prompt is the only context this call needs, and memory was never one of the four primitives committed to in the approved proposal.
- **Never auto-applied**: the endpoint only returns suggestions in the HTTP response. Nothing in this codebase modifies the resume or auto-sends anything.

## Stale Application Detection

`GET /api/applications/stale` identifies applications that have gone quiet. The rule is fixed and simple: **`dateApplied` strictly older than 7 days is stale** (a record applied exactly 7 days ago is not yet stale — the boundary itself is not included).

- `backend/src/services/applications.service.js` — `getStaleCutoffDate()` computes a UTC-midnight cutoff date (not a raw `now() - 7*24h` timestamp, so "stale" resolves consistently regardless of what time of day the query runs); `findStaleApplications()` queries `WHERE dateApplied < cutoff`, ordered oldest-first; `isApplicationStale()` is the single-record equivalent used by the Follow-up endpoint.
- The query `select`s only `id`, `company`, `role`, `status`, `dateApplied`, `resumeVersion` — never `resumeText`/`jobDescription` — since the stale list doesn't need them.
- This is a pure database query — no AI call is involved in detecting staleness.

## Follow-up Agent (AI Integration)

The second AI agent, built the same way as the Resume Reviewer Agent — same `ToolRegistry` → skill → `ModelClient` pipeline, same forced tool-calling, same Zod validation, same shared retry logic.

- **Skill**: `backend/src/ai/skills/followUp.js` exports `draft_followup`, registered in `ToolRegistry` alongside `resume_review`.
- **Trigger condition**: `POST /api/applications/:id/follow-up` only runs for a genuinely stale application (`isApplicationStale`); a non-stale application gets a `422` and the AI is never called.
- **Input**: only `company`, `role`, `dateApplied`, `resumeVersion` — the model is explicitly instructed never to invent facts it wasn't given (no fabricated interview status, recruiter name, or prior correspondence).
- **Output**: `{ subject: string, body: string }`, validated against `followUpOutputSchema` (`backend/src/validators/followUp.validator.js`).
- **Never sent automatically**: the endpoint only returns the draft in the HTTP response. The frontend's Stale Applications panel renders it in editable fields — sending the email is entirely up to the user, outside this app.
- **Failure modes**: identical shape to the Resume Reviewer Agent's — `404` (no such application), `422` (not stale), `503` (no API key for the selected provider), `502` (provider call failed after retry, or returned output that failed Zod validation).

## Reliability

Both AI skills share the same reliability layer — nothing about validation, retry, or error handling is duplicated or provider-specific.

- **Structured output validation (Zod)**: every AI response must pass a Zod schema before it is ever returned — `resumeReviewOutputSchema` (`matchScore` 0-100, `missingKeywords` string array, `suggestions` 2-3 strings) for the Resume Reviewer Agent, `followUpOutputSchema` (`subject`/`body`, both non-empty strings) for the Follow-up Agent. A response that fails validation is rejected with a `502` — never passed through, patched, or replaced with a fabricated result.
- **Retry mechanism** (`backend/src/ai/retry.js` — `withRetry`/`isRetryableError`, shared by both skills): wraps only the raw provider call (`modelClient.generate()`), never the Zod validation step after it.
  - **Retryable**: HTTP `429` (rate limit), HTTP `5xx` (provider-side error), or a connection/timeout failure (`APIConnectionError`/`APIConnectionTimeoutError` — the same class names both `groq-sdk` and the `openai` SDK, used for OpenRouter, throw).
  - **Not retryable**: an invalid/missing API key, a bad request, an invalid model, or — critically — a successfully-returned response that fails Zod validation (retrying wouldn't fix a schema/prompt problem, and could mask a real bug).
  - **Maximum attempts: 2** (one retry), fixed — no backoff, no unbounded loop.
- **Missing API key**: checked before any provider call is attempted — `503` for `/analyze` and `/follow-up`, naming exactly which env var is missing; for `/compare-models`, that one provider's entry becomes a labeled config error while the other provider's real result is still returned.
- **Provider call failure** (after retries are exhausted): `502` for `/analyze`/`/follow-up`; for `/compare-models`, only that provider's entry becomes a labeled error — it never blocks or replaces the other provider's result.
- **No fabricated fallback, anywhere**: every failure mode above ends in a real, controlled error response (or a labeled per-provider error for the comparison endpoint) — never a default, placeholder, or guessed AI result.

## AI Provider Routing

Both AI skills are provider-agnostic — neither `resumeReview.js` nor `followUp.js` contains any Groq- or OpenRouter-specific code. Which concrete `ModelClient` actually gets used is decided in one place, `backend/src/ai/index.js`'s `createModelClient()`:

```text
AI_PROVIDER=groq        (default if unset)  →  GroqModelClient       (requires GROQ_API_KEY)
AI_PROVIDER=openrouter                      →  OpenRouterModelClient (requires OPENROUTER_API_KEY)
```

- Selection is **explicit and manual** — a single environment variable read once per request when a controller calls `ai.createModelClient()`. It is not a per-agent choice; whichever provider is selected serves both the Resume Reviewer and the Follow-up Agent.
- **There is no automatic fallback.** If `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY` is missing, the request fails with a `503` naming exactly that — it does not silently fall back to Groq, even if a `GROQ_API_KEY` happens to be configured too.
- See [Model Selection Rationale](#model-selection-rationale) for why each provider/model was chosen, and note that only Groq has actually been exercised against a real API key in this environment — see [Known Limitations](#known-limitations).

## Live Multi-Model Comparison

**Provider routing** (above) and **model comparison** (this section) are deliberately different mechanisms, not the same thing:

- **Routing** = pick *one* provider to actually serve a request. `AI_PROVIDER` selects it; `resume_review`/`draft_followup` never see which one is active.
- **Comparison** = send the *same* request to *both* providers at once, purely to see their outputs side by side. `AI_PROVIDER` is irrelevant to it — `POST /api/applications/:id/compare-models` always attempts both Groq and OpenRouter, regardless of the current `AI_PROVIDER` setting.

`compareModels` (`applications.controller.js`) reuses the existing `resume_review` skill completely unchanged — the same prompt, the same forced tool-calling, the same `resumeReviewOutputSchema` Zod validation, the same `withLogging` hook, and (since the skill itself calls it) the same `withRetry` behavior per provider. The only new code is the controller function itself: it deliberately bypasses `ai.createModelClient()` (which is single-provider by design) and constructs `ai.GroqModelClient`/`ai.OpenRouterModelClient` directly — both already exported for exactly this kind of direct construction — then runs the skill against each independently and concurrently.

**Response shape:**
```json
{
  "applicationId": "clx...",
  "results": [
    { "provider": "groq", "model": "openai/gpt-oss-120b", "status": "success", "result": { "matchScore": 82, "missingKeywords": ["Docker"], "suggestions": ["...", "..."] } },
    { "provider": "openrouter", "model": null, "status": "error", "error": "AI provider is not configured on this server (missing OPENROUTER_API_KEY)" }
  ]
}
```

- `model` is read back from the actual constructed client (`modelClient.model`), never hardcoded — so it always reflects the real default/override in use.
- **No automatic fallback**: a provider that fails or isn't configured becomes its own labeled `status: "error"` entry — the other provider's result (or lack of one) is never substituted in its place.
- **Nothing is persisted** — like `/analyze` and `/follow-up`, the comparison result only ever appears in the HTTP response.
- **Status code logic**: `200` as long as at least one provider produced a real result (a partial comparison — one success, one error — is still a useful, honest response); `502` only when every provider that was actually configured failed; `503` only when neither provider is configured at all, since there's nothing to compare in that case.

**Verification status:** tested entirely with both `GroqModelClient` and `OpenRouterModelClient` mocked (`backend/tests/compareModels.test.js`) — same input sent to both, correct labels, malformed-output rejection, one-provider-failure handling, missing-config handling, and that a transient failure is still retried per provider before the comparison gives up on it. **No real live OpenRouter call has been made** — no `OPENROUTER_API_KEY` is configured in this environment (confirmed directly, not assumed). If a real key is added, this endpoint would call OpenRouter for real exactly like `/analyze`/`/follow-up` already do for Groq — the code path is identical, just untested against OpenRouter's actual API.

## Tech Stack & Why

| Layer | Choice | Why |
|---|---|---|
| Backend framework | Express 5 | Matches the approved proposal; Express 5 auto-forwards rejected async handlers to error middleware, removing try/catch boilerplate from every controller. |
| ORM | Prisma 6 (`prisma` + `@prisma/client`, pinned to `6.19.3`) | Matches the approved proposal. Pinned deliberately below the newly-released Prisma 7, which removes `datasource url` from `schema.prisma` in favor of a `prisma.config.ts` + driver-adapter setup — a heavier, less standard pattern not assumed by the proposal or a typical review. |
| Database | PostgreSQL | Matches the approved proposal. |
| Validation | Zod 4 | Matches the approved proposal; used for both request bodies and the AI agent's structured output. |
| Resume Reviewer Agent | Groq API (`groq-sdk` `1.6.0`, OpenAI-compatible Chat Completions, model `openai/gpt-oss-120b`), forced tool/function calling | The approved proposal originally specified Anthropic Claude; the agent was later migrated to Groq (same `ModelClient` abstraction, same skill, same behavior — only the concrete client and env var changed). Forced tool calling still guarantees a structured response instead of free-form chat. |
| Second AI provider | OpenRouter (`openai` SDK `7.10.0` pointed at OpenRouter's OpenAI-compatible base URL, model `nvidia/nemotron-3.5-lightning:free`) | Satisfies the ≥2-LLM-provider requirement behind the same `ModelClient` abstraction — no dedicated OpenRouter SDK exists, and OpenRouter's own docs recommend the `openai` SDK for exactly this. See [Model Selection Rationale](#model-selection-rationale) for the verification caveat. |
| Backend tests | Vitest + Supertest | Vitest for a fast, modern runner; Supertest to exercise the Express app directly (`app.js` exports the app without `.listen()` specifically so tests can import it). Both AI providers are always mocked — see [Testing](#testing). |
| Frontend framework | React 19 (Vite 8) | Matches the approved proposal; Vite gives fast local dev and a simple, standard React (JS) template. |
| Frontend tests | Vitest + React Testing Library + jsdom | Same test runner family as the backend for consistency; RTL for behavior-driven component tests per the proposal's "React Testing Library" requirement. |
| Containerization | Docker Compose (`postgres:16-alpine`, a single-stage Node backend image, a 2-stage Node-build/nginx-serve frontend image) | Satisfies the Week 7 deployment requirement with the simplest local option — no cloud infrastructure. See [Running JobTrackr with Docker](#running-jobtrackr-with-docker) for its current, honestly-stated verification status. |

## API Overview (Currently Implemented)

Base URL: `http://localhost:3000`. All request/response bodies are JSON.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/api/health` | — | `200` `{ status: "ok", timestamp }` | Liveness check. |
| POST | `/api/applications` | `{ company, role, status?, dateApplied, resumeVersion, resumeText, jobDescription }` | `201` created record | `status` defaults to `APPLIED` if omitted. |
| GET | `/api/applications` | — | `200` array of records | Ordered by `createdAt` descending. |
| GET | `/api/applications/stale` | — | `200` array of `{ id, company, role, status, dateApplied, resumeVersion }` | Applications with `dateApplied` strictly older than 7 days. Must be registered before `GET /:id` in the router so Express doesn't match `stale` as an `:id`. No `resumeText`/`jobDescription` in the response, no AI call involved. |
| GET | `/api/applications/:id` | — | `200` record / `404` | |
| PUT | `/api/applications/:id` | any non-empty subset of the create fields | `200` updated record / `400` / `404` | An empty body (`{}`) is rejected with `400` by design. |
| DELETE | `/api/applications/:id` | — | `204` / `404` | |
| POST | `/api/applications/:id/analyze` | — (no body) | `200` `{ matchScore, missingKeywords, suggestions }` | Runs the Resume Reviewer Agent. See failure modes below. |
| POST | `/api/applications/:id/follow-up` | — (no body) | `200` `{ subject, body }` | Runs the Follow-up Agent. Only for a stale application (see failure modes below). Nothing is persisted or sent. |
| POST | `/api/applications/:id/compare-models` | — (no body) | `200`/`502` `{ applicationId, results: [...] }` | Sends the same resume_review task to Groq **and** OpenRouter independently and returns both, labeled. See [Live Multi-Model Comparison](#live-multi-model-comparison) and failure modes below. |

`status` must be one of: `APPLIED`, `INTERVIEWING`, `OFFER`, `REJECTED`, `WITHDRAWN`. `resumeText` is required on create; it's nullable at the database level only so pre-existing rows aren't broken by the migration that added it. `dateApplied` can never be before the record's own creation date — on create it can't be before today (`400`, validated in Zod); on update it can't be before the record's actual `createdAt` (`400`, checked in the controller against the fetched row). The frontend date picker also sets a matching `min` for immediate feedback, but the backend is the actual enforcement.

**`POST /:id/analyze` failure modes:**

| Status | Cause |
|---|---|
| `404` | Application does not exist. |
| `422` | Application exists but has no `resumeText` saved. |
| `503` | Server has no API key configured for the currently-selected `AI_PROVIDER` (`GROQ_API_KEY` or `OPENROUTER_API_KEY`). |
| `502` | The AI provider call failed, or it returned output that failed Zod validation. |

**`POST /:id/follow-up` failure modes:**

| Status | Cause |
|---|---|
| `404` | Application does not exist. |
| `422` | Application exists but is not stale yet (`dateApplied` is 7 days old or newer). |
| `503` | Server has no API key configured for the currently-selected `AI_PROVIDER`. |
| `502` | The AI provider call failed, or it returned output that failed Zod validation. |

**`POST /:id/compare-models` failure modes:**

| Status | Cause |
|---|---|
| `404` | Application does not exist. |
| `422` | Application exists but has no `resumeText` saved. |
| `503` | **Neither** `GROQ_API_KEY` nor `OPENROUTER_API_KEY` is configured — there is nothing to compare. |
| `502` | Every provider that *was* configured failed its call or returned output that failed Zod validation (see below — a single provider failing does not produce a `502` by itself). |

Error shape (all non-2xx responses):
```json
{ "error": "ValidationError", "message": "Request validation failed", "details": [{ "path": "company", "message": "company is required" }] }
```

## Performance

`GET /api/applications/stale` (`findStaleApplications()`) is the only query in the app that filters (`WHERE dateApplied < cutoff`) and sorts (`ORDER BY dateApplied ASC`) on `dateApplied`, which previously had no index — every call was a full table scan plus a separate sort. `prisma/schema.prisma` now adds `@@index([dateApplied])` on `JobApplication` (migration `add_date_applied_index`), letting Postgres satisfy both the range filter and the ordering directly from the index. Purely a database-level change — the stale rule (`dateApplied` strictly older than 7 days), the API response shape, and every other endpoint are unaffected.

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

## Running JobTrackr with Docker

An alternative to the manual setup above: a local Docker Compose stack (PostgreSQL + backend + frontend) intended for a self-contained local demonstration — this does not replace or change the manual `npm run dev` setup in either package, and there is no cloud/production deployment.

> **Verification status: the Dockerfiles and `docker-compose.yml` below have NOT been runtime-tested.** Docker is not installed on the machine this project was developed on, so `docker compose build`/`up` could not actually be run here. The configuration follows standard, well-established patterns for this exact stack (Node + Postgres + an nginx-served Vite build), but until someone with Docker actually runs it, treat it as unverified rather than confirmed working. Everything else in this README (tests, non-Docker local dev, the API) has been actually run and verified.

**Prerequisites:** Docker Desktop (or another Docker Compose v2-compatible engine) installed and running.

**1. Provide environment variables** — copy the root example file and fill in real values only in your own local, git-ignored copy:

```bash
cp .env.example .env
# edit .env: set a real GROQ_API_KEY (or OPENROUTER_API_KEY + AI_PROVIDER=openrouter)
# if you want AI endpoints to work; everything else has a working default
```

This root `.env` is only read by `docker compose` itself — it's separate from `backend/.env`/`frontend/.env`, which are for the non-Docker setup above.

**2. Build the images:**

```bash
docker compose build
```

**3. Start the stack:**

```bash
docker compose up
# or in the background:
docker compose up -d
```

On first start, the backend container runs `prisma migrate deploy` against the containerized Postgres (applying the existing migration history — no schema changes) before starting the server.

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Postgres: published on localhost:5432 (for inspecting with a local client if needed)

**4. Verify it's working:**

```bash
docker compose ps                              # all three services should show "healthy"/"running"
curl http://localhost:3000/api/health           # {"status":"ok","timestamp":"..."}
curl http://localhost:3000/api/applications     # [] on a fresh database
```

Then open http://localhost:5173 in a browser — the app should load an empty application list with no errors.

**5. View logs:**

```bash
docker compose logs -f            # all services
docker compose logs -f backend    # just the backend
```

**6. Stop the containers:**

```bash
docker compose down          # stops and removes containers, keeps the Postgres volume (your data persists)
docker compose down -v       # also deletes the Postgres volume — a fresh database next time
```

**Notes:**
- No API key is required for the stack to start, build, migrate, or serve CRUD functionality — exactly like the non-Docker setup. Only `POST /:id/analyze` and `POST /:id/follow-up` need a real `GROQ_API_KEY` (or `OPENROUTER_API_KEY`), and fail cleanly with `503` without one.
- The frontend's `VITE_API_BASE_URL` is baked into its static build at image-build time (Vite inlines `VITE_`-prefixed env vars into the bundle), not read at container start — if you change `BACKEND_PORT` or `VITE_API_BASE_URL` in `.env`, re-run `docker compose build frontend`.
- No real secret is ever written into `Dockerfile`, `docker-compose.yml`, or any tracked file — both reference environment variables only.

## Environment Variables

No real secrets are committed anywhere in this repository; both `.env` files are git-ignored and only `.env.example` (placeholder values) is tracked.

**`backend/.env.example`**
```
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/jobtrackr?schema=public"

# Which AI provider the Resume Reviewer / Follow-up Agent use: groq | openrouter.
# Defaults to "groq" if unset. Only the matching key below needs to be set.
# AI_PROVIDER=groq

# Required only if AI_PROVIDER=groq (or unset, the default).
# The app and all CRUD functionality work fine with this left unset.
# GROQ_API_KEY=your-groq-api-key

# Required only if AI_PROVIDER=openrouter.
# OPENROUTER_API_KEY=your-openrouter-api-key
```

`AI_PROVIDER`, `GROQ_API_KEY`, and `OPENROUTER_API_KEY` are all **optional** in `config/env.js` on purpose — the server and every CRUD test must keep working with no AI key configured at all. Whichever provider is selected, its analyze/follow-up endpoints fail cleanly with `503` at call time if that provider's key is missing, rather than blocking the whole app from starting. There is no automatic fallback between providers (a later phase) — `AI_PROVIDER` is a manual switch. **Put your real key(s) only in `backend/.env`** (git-ignored) — never in `frontend/.env`, never in frontend source, never committed.

**`frontend/.env.example`**
```
VITE_API_BASE_URL=http://localhost:3000
```

**Root `.env.example`** (Docker Compose only — see [Running JobTrackr with Docker](#running-jobtrackr-with-docker)): `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_PORT`, `BACKEND_PORT`, `FRONTEND_PORT`, `AI_PROVIDER`, `GROQ_API_KEY`/`OPENROUTER_API_KEY`, `VITE_API_BASE_URL`. This is a separate file from the two above and is only read by `docker compose` itself — it never affects `npm run dev` in either package.

## Testing

```bash
cd backend && npm test           # Vitest + Supertest — 103 tests, 18 files
cd frontend && npm test          # Vitest + React Testing Library — 36 tests, 5 files
cd frontend && npm run build     # production build (also what the frontend Docker image runs)
cd backend && npx prisma validate  # schema sanity check
```

**Current status (last verified locally): backend 103/103 passing, frontend 36/36 passing.**

**Neither Groq nor OpenRouter is ever called for real during automated tests.** The AI-boundary mocking technique is consistent throughout the suite: `resumeReview.test.js`/`followUp.test.js`/`hooks.test.js` inject a fake `modelClient` directly; `groqModelClient.test.js`/`openRouterModelClient.test.js` construct the real client class but replace its internal SDK call with a mock; every endpoint-level test (`analyze*.test.js`, `followUp*.test.js`, the E2E test) replaces `GroqModelClient` on the shared, cached `backend/src/ai` module object with a mock class before any request is made — a plain Node module-cache technique, chosen after confirming `vi.mock` does not reliably intercept this project's plain CommonJS `require()` chain. A real Groq API key is only ever used for manual/demo verification, never in `npm test`.

- **Backend tests** (103, 18 files), grouped by feature:
  - CRUD/health: `applications.test.js`, `health.test.js`.
  - Resume Reviewer Agent: `resumeReview.test.js`, `hooks.test.js`, `ai.test.js`, `groqModelClient.test.js`, `analyze.test.js`, `analyzeNotConfigured.test.js`.
  - Stale detection: `staleApplications.test.js` (7-day boundary, ordering, field selection).
  - Follow-up Agent: `followUp.test.js` (skill), `followUpEndpoint.test.js` (404/422/503/502/200 + boundary), `followUpNotConfigured.test.js`.
  - Multi-model routing: `modelClientRouting.test.js`, `openRouterModelClient.test.js`.
  - Live model comparison: `compareModels.test.js` (same task sent to both providers, correct provider/model labels, malformed-output rejection, one-provider-failure isolation, missing-config handling, retry still engages per provider).
  - Retry/reliability: `retry.test.js` (generic classification/attempt logic), `retryProviderIntegration.test.js` (retry through the real Groq/OpenRouter client classes and their actual SDK error types).
  - **End-to-end**: `followUp.e2e.test.js` — one test walking a real application through creation → backdating to stale → `GET /stale` discovery → `POST /:id/follow-up`, through the real route/controller/`ToolRegistry`/skill/Zod-validation chain, with only `GroqModelClient` mocked.
- **Frontend tests** (36, 5 files): `ApplicationList`, `ApplicationForm`, `ApplicationDetails` (incl. the Analyze Fit flow), `StaleApplications` (list, selection, follow-up generation, editable draft), and `App.test.jsx` (full app-level flows), all with `applicationsApi` mocked.

## Known Limitations

Honestly documented, not exaggerated:

- **No job-board scraping or external job data integration** — all application data is user-entered.
- **No auto-apply.** Nothing in this codebase submits an application anywhere.
- **No automatic email sending.** The Follow-up Agent only ever returns a draft `{subject, body}` in the HTTP response. The frontend renders it in editable fields; sending it is entirely up to the user, outside this app. Nothing is persisted back to the database either.
- **Docker runtime has not been tested on this development PC** (Docker is not installed here) — see [Running JobTrackr with Docker](#running-jobtrackr-with-docker) for exactly what has and hasn't been verified.
- **OpenRouter has not been exercised with a real API call** in this environment — no `OPENROUTER_API_KEY` was available. Its model choice was verified against OpenRouter's live model catalog (tool-calling support), not by an actual successful request. See [Model Selection Rationale](#model-selection-rationale).
- **The frontend is intentionally lightweight** — no router, no global state library, no design system; it exists to demonstrate the backend/AI functionality, not to be a polished product UI.
- **No persisted analysis history.** Both `POST /:id/analyze` and `POST /:id/follow-up` return their result directly in the HTTP response; nothing is written back to the `JobApplication` row. Re-running either always calls the model again.
- **No memory layer.** Both AI agents are single-shot, stateless calls by design — this matches the approved proposal, which never committed to a memory primitive.
- **No authentication or authorization.** All applications are globally readable/writable; there is no concept of a logged-in user.
- **No dashboard, charts, or analytics.**
- **No pagination or filtering** on `GET /api/applications` — it returns the full list.
- **No cloud/production deployment** — the Docker Compose stack provides a local containerized demo only.

## Model Selection Rationale

**Resume Reviewer Agent → Groq (`openai/gpt-oss-120b`), via `groq-sdk`.** The approved proposal originally specified Anthropic Claude; the agent was later migrated to Groq's OpenAI-compatible API. The first default model chosen from Groq's documentation, `llama-3.3-70b-versatile`, turned out to have been retired from Groq's actual hosted lineup — it returned a real `404 model_not_found` at runtime despite docs suggesting support. This was caught and fixed by querying Groq's live `GET /openai/v1/models` endpoint with a real key to get the actual current model list, rather than trusting documentation alone. `openai/gpt-oss-120b` was chosen from that live list — it's confirmed tool-use capable and is the exact model used in Groq's own official tool-calling example. Forced tool calling means the response is a schema-shaped object, not free text to be parsed — this is what makes the Zod validation step meaningful rather than a formality. The model name is read from `GroqModelClient`'s `model` option rather than hardcoded inline, so it can be swapped for another live, tool-capable model without touching call sites.

**Second provider (≥2-LLM-provider requirement) → OpenRouter (`nvidia/nemotron-3.5-lightning:free`), via the `openai` SDK pointed at OpenRouter's OpenAI-compatible base URL.** Either agent (Resume Reviewer or Follow-up) can use either provider — `AI_PROVIDER=groq|openrouter` is a manual switch (`ai/index.js`'s `createModelClient()`), not a per-agent choice, and there is no automatic fallback yet. Unlike the Groq pick, this one has **not** been verified with a real API call — no `OPENROUTER_API_KEY` was available in this environment. It was chosen by querying OpenRouter's live `GET /api/v1/models` catalog directly (docs alone weren't trusted, per the same lesson learned from the Groq model mix-up) and confirming its `supported_parameters` includes `tools`. **Caveat:** as of that check, none of OpenRouter's well-known free models (Llama, Gemini, Mistral, Qwen, DeepSeek) advertised tool-calling support — only a handful of smaller providers did. Free-tier availability on OpenRouter rotates; if this default model stops returning tool calls, re-check that endpoint and override via `OpenRouterModelClient`'s `model` constructor option.
