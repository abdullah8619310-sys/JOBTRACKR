# prompts.md — AI Interaction Log

This log covers the AI-assisted development session(s) for **Week 5 (second half): Project Scaffold & Architecture**. All entries below are drawn directly from the actual Claude Code session used to build this milestone — none are invented. Long original prompts are condensed for readability; nothing has been added to or embellished beyond what was actually requested. Where a prompt is condensed, that is noted explicitly.

**Note on pre-session state:** `backend/package.json` (listing `express`, `cors`, `dotenv`, `zod`, `nodemon`, `supertest`, `vitest`) already existed before the AI-assisted session began. This was set up manually by the developer; no AI prompt is associated with it, and it is recorded here only for accuracy.

---

## Week 5 — Project Scaffold & Architecture

### 1. Backend foundation & JobApplication CRUD API

**Prompt purpose:** Scaffold the Express + Prisma + PostgreSQL backend and implement full CRUD for the `JobApplication` resource, following the mentor's instruction to build the backend API first with only a very small frontend, before enhancing the frontend later.

**Prompt used (condensed from the original, which also attached the approved Phase 3 proposal PDF and specified a full pre-work/reporting workflow):**
> "Implement JobTrackr Phase 3 backend foundation and Job Application API only — do not build the frontend, dashboard, or AI agents yet. Inspect the existing `backend/package.json` and structure first, then set up: Express app config, environment variables/`.env`, Prisma for PostgreSQL, a `JobApplication` model designed strictly from the proposal (company, role, status, date applied, resume version, job description text), Zod validation, full CRUD endpoints (`POST/GET/GET:id/PUT/DELETE /api/applications`), a `GET /api/health` endpoint, proper error handling, basic Vitest + Supertest tests, `package.json` scripts, `.gitignore`, and `.env.example`. Stop after this milestone — do not continue to the next one."

**Result / outcome:**
- Built `backend/src/{app,server}.js`, `config/env.js`, `lib/prisma.js`, `routes/`, `controllers/applications.controller.js`, `validators/applications.validator.js`, `middleware/{notFound,errorHandler}.js`, `utils/AppError.js`, and `prisma/schema.prisma`.
- **Correction applied:** `npm install prisma` initially resolved to an unreleased `8.0.0-rc.12`, which removes `datasource url` from `schema.prisma` in favor of a `prisma.config.ts` + driver-adapter architecture. This was not what the proposal or a standard review would expect, so both `prisma` and `@prisma/client` were pinned to the latest **stable** `6.19.3` instead, restoring the conventional `url = env("DATABASE_URL")` schema.
- **Correction applied:** Vitest 4 rejects `require('vitest')` in a CommonJS test file; fixed by enabling `test.globals: true` in `vitest.config.js` instead of converting the project to ESM.
- Verified: health test passing without a database; full CRUD test file correctly failing with clean `500`s (not crashes) against no live database, proving the validation/error-handling pipeline; then, once the developer connected a real local PostgreSQL instance and ran the migration, **10/10 backend tests passing**.

### 2. Fix: empty update body incorrectly accepted

**Prompt purpose:** A regression surfaced once a real database was connected — `PUT /api/applications/:id` with an empty body `{}` returned `200` instead of the expected `400`.

**Prompt used (actual, lightly trimmed):**
> "The backend JobApplication API is now connected to PostgreSQL and 9/10 Vitest tests pass. There is exactly one failing test: `tests/applications.test.js` 'rejects an update with no fields' — expected 400 but received 200 ... Fix only this validation issue ... Do not remove or weaken the existing test ... After fixing it, run `npm test`."

**Result / outcome:** Root cause: `updateApplicationSchema` was `createApplicationSchema.partial()`, and Zod's `.partial()` does not strip a field's `.default(...)` — so `{}` parsed to `{status: 'APPLIED'}` (one key), which incorrectly passed the "at least one field" refinement. Fixed in `backend/src/validators/applications.validator.js` by deriving both schemas from a shared field shape where only the create schema applies the `status` default. Re-ran `npm test`: **10/10 passing**.

### 3. Small React frontend connected to the backend API

**Prompt purpose:** Build the small/simple React frontend the mentor asked for, wired to the already-working backend CRUD API — list, add, view, edit, delete applications — without starting the AI or dashboard milestones.

**Prompt used (condensed from the original, which specified exact scope, file layout, endpoints to use, env var conventions, and a required final report):**
> "Build ONLY a small/simple React frontend that connects to the existing backend API. Inspect the backend's actual routes/controllers/validators/tests first so the frontend matches the real API contract — don't invent endpoints or fields. Use React + Vite + JavaScript, a clean `frontend/src/api/` layer, and `VITE_API_BASE_URL` via `.env`. Implement: application list (loading/error/empty states), add-application form, edit, delete (with confirmation), and view-details (using `GET /:id`). Add React Testing Library tests covering list render, loading, populated list, add-form submit, delete, and an error state. Do not implement any AI features, dashboard, auth, or new backend endpoints. Run frontend tests and re-run backend tests to confirm no regression. Stop after this milestone."

**Result / outcome:**
- Scaffolded `frontend/` with `npm create vite@latest frontend -- --template react`, then added `frontend/src/api/{httpClient,applicationsApi}.js`, `components/{ApplicationList,ApplicationForm,ApplicationDetails}.jsx`, `constants.js`, and `App.jsx` to orchestrate state.
- Added Vitest + React Testing Library + jsdom; enabled `test.globals` for consistency with the backend config.
- **12/12 frontend tests passing**; re-ran backend afterward — still **10/10**, confirming no regression.
- Additionally verified the API layer against the real running backend (not mocks): a live `create → list → update → delete` round trip via `curl`, plus a CORS preflight check, both succeeded.

### 4. Connect the local repository to GitHub

**Prompt purpose:** Initialize git at the `JOBTRACKR` root (one repo covering both `backend/` and `frontend/`, not separate per-package repos) and push the Week 5 scaffold to the empty GitHub repository the developer had created.

**Prompt used (condensed from the original, which specified a 10-step verification/commit/push workflow):**
> "I created an empty GitHub repository for JobTrackr at `https://github.com/abdullah8619310-sys/JOBTRACKR.git`. Connect the existing local project to it. Inspect current structure and git status first; do not create separate repos for backend/frontend; the repo root must be `JOBTRACKR`. Initialize git if needed, verify a root `.gitignore` excludes secrets, review the scaffold, show me exactly what will be committed before committing, then commit and push."

**Result / outcome:** Confirmed no existing `.git` anywhere in the tree. Added a root `.gitignore` (defense-in-depth on top of the already-correct `backend/.gitignore` and `frontend/.gitignore`). Staged all files, then explicitly grepped the staged list for `node_modules`, `.env`, `dist`, `coverage` — none were present (only `.env.example` files were tracked). Committed 49 files as the initial commit and pushed to `main` on the GitHub remote.

### 5. Week 5 documentation (this file and README.md)

**Prompt purpose:** Produce the two required Week 5 documentation deliverables — root-level `README.md` and `prompts.md` — accurately reflecting the current, non-AI state of the project, without inventing features or prompts.

**Prompt used (condensed):**
> "Create a root-level README.md documenting the actual current project (architecture diagram, folder structure, tech stack rationale, API overview, run/test instructions, env vars without secrets, current limitations, and a 'Model Selection Rationale' section that honestly states no AI model has been selected yet). Create a root-level prompts.md logging the actual prompts used during this Week 5 work, labeling anything not verifiable as reconstructed rather than an exact transcript. Do not modify any application code. Show git status and git diff for review — do not commit or push yet."

**Result / outcome:** This `prompts.md` and the accompanying `README.md`, written directly from this session's own conversation history (an exact source, not an inference) and condensed for length where noted above. No application code was touched. Pending developer review before commit.
