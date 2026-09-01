# prompts.md — AI Interaction Log

This log covers the AI-assisted development sessions for **Week 5 (second half): Project Scaffold & Architecture**, **Week 6: Agentic AI Implementation**, and the subsequent **Anthropic → Groq provider migration**. All entries below are drawn directly from the actual Claude Code sessions used to build this project — none are invented. Long original prompts are condensed for readability; nothing has been added to or embellished beyond what was actually requested. Where a prompt is condensed, that is noted explicitly.

> **Note:** Entry 11 below describes the Resume Reviewer Agent as originally built against the Anthropic Claude API. Entry 12 documents its later migration to Groq. Entry 11 is left as an accurate historical record of what was built at the time — see entry 12 and the current `README.md` for the agent's actual current provider.

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

---

## Week 6 — Agentic AI Implementation (Resume Reviewer Agent)

### 6. AI integration stub layer (closing the last Week 5 gap)

**Prompt purpose:** Before starting Week 6, add the minimal stubbed AI integration layer the Week 5 scaffold requirements (and the approved proposal's own Week 5 row) called for — a model-client interface, an agent-runner interface, and a tool/skill registry — with no real AI calls yet.

**Prompt used (condensed):**
> "Inspect the current JOBTRACKR repository and implement ONLY a minimal stubbed AI integration layer... Add a model-client interface/stub with NO real API calls. Add an agent-runner interface/stub. Add a tool/skill registry interface/stub... Do NOT implement the Resume Reviewer Agent yet... Add focused tests proving the stubs/interfaces can be imported and invoked safely. Run the complete backend test suite afterward."

**Result / outcome:** Created `backend/src/ai/{errors,toolRegistry,modelClient,agentRunner,index}.js` and `backend/tests/ai.test.js`. `ToolRegistry` was built as a real, working registry (pure bookkeeping, no AI involved); `ModelClient`/`AgentRunner` were deliberately built as stubs that throw a named `NotImplementedError` when invoked rather than returning fake data. **19/19 backend tests passing** (10 existing + 9 new). A follow-up prompt asked for a README-only update adding this new `backend/src/ai/` subtree and a brief description of the three pieces to the folder structure and architecture docs — done with no code changes.

### 7. Week 6 gap analysis (first pass)

**Prompt purpose:** Before writing any Week 6 code, compare the repository against the Week 6 goals (core business logic, primary AI feature, skills/tools registered, memory layer, UI wiring, error handling) and the approved proposal, analysis only.

**Result / outcome:** Identified: CRUD complete; `ToolRegistry` functional but empty; `ModelClient`/`AgentRunner` still pure stubs; **no field existed yet to store actual resume text** (only a `resumeVersion` label) — flagged as the step-1 blocker before any agent code could be meaningful. Also flagged that the generic program document lists a "memory layer" as a Week 6 goal, while the approved proposal's own committed primitives (skills/tools, structured outputs, hooks, function calling) never included memory — raised as a discrepancy worth deciding on rather than silently resolving either way.

### 8. Persisted `resumeText` (plan, then implementation)

**Prompt purpose:** Add a real `resumeText` field to `JobApplication` so the Resume Reviewer Agent would have real input to work with, as a standalone data-model/API/frontend preparation step before any AI code.

**Prompt used (condensed, across a plan-first message and an implement-the-plan message):**
> "For the Resume Reviewer Agent, we will persist the actual resume text... Before modifying anything: inspect the schema/validators/controllers/tests, determine which validation and frontend fields must change, determine the migration... Do not implement yet." Followed by: "Proceed with Week 6 Step 1... using the implementation plan... Do NOT implement any LLM/agent/hook/memory functionality yet."

**Result / outcome:** Added `resumeText String? @db.Text` (nullable at the DB level — safe for a populated table with no default needed — but required at the Zod/API level for new applications) via migration `20260829092757_add_resume_text`. Updated `applications.validator.js`, the create-test payload, and the frontend `ApplicationForm`/`ApplicationDetails` components and their tests (discovered along the way: jsdom enforces the HTML5 required-field constraint, so tests had to actually fill the new field, not just update assertions). Hit and fixed a Windows-specific Prisma `EPERM` file-lock error during `prisma generate`, caused by a running `npm run dev` holding the query-engine binary open. **Backend 19/19, frontend 12/12 passing** afterward.

### 9. Week 6 gap analysis (second pass, post-`resumeText`)

**Prompt purpose:** Re-check readiness for the actual Resume Reviewer Agent implementation now that `resumeText` was persisted, analysis only.

**Result / outcome:** Confirmed both required inputs (`resumeText`, `jobDescription`) now live on one record. Proposed skipping `AgentRunner` for this single-shot flow (a deterministic one-call skill doesn't need a planner/executor loop) and skipping a separate memory layer (matches the proposal's own primitive list) — both flagged for explicit approval rather than assumed.

### 10. Environment / dependency preparation

**Prompt purpose:** Step 1 of the approved implementation plan — add the Anthropic SDK and environment configuration only, nothing else yet.

**Result / outcome:** Checked `npm view @anthropic-ai/sdk dist-tags` before installing (after the earlier Prisma RC surprise) and pinned the actual stable `0.122.0`. Added `ANTHROPIC_API_KEY` to `config/env.js` as **optional** — deliberately as a commented-out placeholder in `.env`/`.env.example` rather than an empty value, since an empty string is "defined" to Zod's `.min(1)` and would have crashed the whole app on boot. Verified `config/env.js` still loads correctly with the key absent. **Backend 19/19 still passing.**

### 11. Full Resume Reviewer Agent implementation (backend + frontend + docs)

**Prompt purpose:** Complete the entire remaining Week 6 scope in one pass: the real Resume Reviewer Agent end-to-end, comprehensive tests with the Anthropic API mocked, the frontend "Analyze Fit" UI, and documentation — all per the constraints already agreed (no `AgentRunner`, no memory store, no CRUD regressions, no real API calls in tests).

**Prompt used (condensed from a long, itemized backend/testing/frontend/documentation spec):**
> "Implement the Resume Reviewer Agent end-to-end: Zod output schema (matchScore, missingKeywords, suggestions); concrete Anthropic model client reusing the existing ModelClient abstraction; the resume_review skill; register it in ToolRegistry; a logging hook; keep AgentRunner a stub; the analyze controller and `POST /api/applications/:id/analyze`; clear handling for missing application/missing resume text/model failure/malformed output. Mock the Anthropic API in all tests — no real calls. Then the frontend: Analyze Fit button, loading/error states, display match score/keywords/suggestions, with mocked tests. Then update README.md and prompts.md to match what actually works. Run everything and report."

**Result / outcome:**
- Built `backend/src/validators/resumeReview.validator.js`, `backend/src/ai/clients/anthropicModelClient.js` (extends the existing `ModelClient`, uses Claude tool-use/function calling), `backend/src/ai/skills/resumeReview.js`, `backend/src/ai/hooks.js` (`withLogging`), `backend/src/ai/registry.js` (shared `ToolRegistry` instance registering `resume_review`), and wired `analyzeApplication` + the new route into the existing controller/router.
- **Correction applied:** the first testing approach (`vi.mock('../src/ai/clients/anthropicModelClient', ...)`) silently failed to intercept the plain CommonJS `require()` chain — caught directly, by a real network call reaching Anthropic's API and getting a 401 during a test run. Fixed by changing the controller to access `ai.AnthropicModelClient` via a live property lookup on the shared, cached module object (instead of destructuring at load time), so tests can reliably swap it out via plain object mutation — a Node module-cache technique that doesn't depend on bundler-level mocking behavior.
- Added `resumeReview.test.js`, `hooks.test.js`, `analyze.test.js`, `analyzeNotConfigured.test.js`, and extended `ai.test.js`, covering the skill's success/validation/failure paths, the hook's success/failure logging, and all four required endpoint failure modes (404/422/502/502) plus the 200 success path and the no-API-key 503 case — all with the Anthropic client mocked, never called for real.
- Frontend: added `analyzeApplication` to `applicationsApi.js`, an "Analyze Fit" button and result display to `ApplicationDetails.jsx`, and matching state/handler in `App.jsx`. Added `ApplicationDetails.test.jsx` (new — this component had no tests before) and two new `App.test.jsx` cases for the full flow and the error path.
- **Final verified status: backend 35/35 passing, frontend 19/19 passing**, production build still compiles, Prisma migration state unaffected.
- Updated `README.md` (this file) to accurately describe the real, working Resume Reviewer Agent, the API endpoint and its failure modes, the updated architecture diagram and folder structure, and a filled-in Model Selection Rationale — and this `prompts.md` entry.

### 12. Provider migration: Anthropic Claude → Groq

**Prompt purpose:** Replace the Resume Reviewer Agent's LLM provider from Anthropic Claude to Groq, preserving the entire Week 6 architecture (`ToolRegistry` → hook → `resume_review` skill → `ModelClient` abstraction → concrete client), forced tool/function calling, Zod output validation, and all existing behavior — a provider swap, not a redesign.

**Prompt used (condensed from a very detailed 19-point migration spec):**
> "Migrate the existing JobTrackr Week 6 Resume Reviewer Agent from Anthropic Claude API to the Groq API. Do NOT redesign the architecture... The current AnthropicModelClient should be replaced by a Groq implementation rather than bypassing the ModelClient abstraction... Preserve function calling/tool use — do NOT replace it with plain text generation and fragile string parsing. Preserve Zod validation, the resume_review skill, the logging hook, and ToolRegistry registration. Verify the currently supported Groq model/tool-calling behavior from Groq's official documentation before selecting a model. Update tests so they mock the Groq client boundary — no real API calls. Search for stale Anthropic references afterward. Do not commit or push."

**Result / outcome:**
- **Verified Groq's actual documentation before writing any code** (`console.groq.com/docs/tool-use`, `/docs/openai`, `/docs/api-reference`, plus a tool-calling code sample): confirmed the OpenAI-compatible base URL (`https://api.groq.com/openai/v1`), that `tool_choice` supports forcing one specific tool via `{ type: 'function', function: { name } }` (the OpenAI-compatible equivalent of Anthropic's `tool_choice: { type: 'tool', name }`), that `llama-3.3-70b-versatile` has full tool-use support, and — critically — that a forced tool call's arguments arrive as a **JSON string** (`message.tool_calls[0].function.arguments`) rather than an already-parsed object like Anthropic's `tool_use.input`. Checked `npm view groq-sdk` for the actual stable version (`1.6.0`) before installing, rather than trusting `@latest`.
- Created `backend/src/ai/clients/groqModelClient.js` (extends the existing `ModelClient` base class, calls `chat.completions.create` with forced `tool_choice`, `JSON.parse`s the returned arguments string). Deleted `anthropicModelClient.js`.
- `resumeReview.js` (the skill), `toolRegistry.js`, and `hooks.js` needed **zero changes** — confirmed the provider-agnostic design from Week 6 genuinely held.
- Updated the composition root: `registry.js` now imports and re-exports `GroqModelClient` alongside the shared `toolRegistry`; `index.js` re-exports it from there. The controller still constructs it lazily (only after confirming `env.GROQ_API_KEY` is set), preserving the exact "optional key, CRUD never breaks" design from before — construction was deliberately *not* moved to module-load time, since that would have reintroduced the boot-crash risk the original design avoided.
- Swapped `ANTHROPIC_API_KEY` → `GROQ_API_KEY` in `config/env.js` (still optional) and both `.env`/`.env.example` files (key itself left as a commented-out placeholder in both — no real key ever written to any tracked or local file by this session).
- Removed the `@anthropic-ai/sdk` dependency (`npm uninstall`), added `groq-sdk@1.6.0` pinned exact. Confirmed via `git grep`/`Grep` afterward: zero remaining `ANTHROPIC`, `@anthropic-ai`, or `AnthropicModelClient` references anywhere in `backend/src`, `backend/tests`, or `package.json`; the lockfile shows 0 Anthropic matches and 2 Groq matches.
- Updated `analyze.test.js` and `analyzeNotConfigured.test.js` (env var + mocked class renamed to Groq — same mocking technique as before, since it was provider-agnostic already). `resumeReview.test.js`, `hooks.test.js`, and `ai.test.js` needed no changes. Added a new `groqModelClient.test.js` — the one piece of genuinely new provider-specific logic (JSON-string argument parsing, missing-tool-call and invalid-JSON error paths) that no existing test exercised, since `analyze.test.js` mocks the whole client class rather than its internals.
- **Final verified status: backend 40/40 passing** (35 existing + 5 new), **frontend 19/19 passing unchanged** (frontend never referenced any provider — confirmed via grep — so zero frontend changes were needed), production build still compiles, `prisma validate` and `prisma migrate status` both clean (no new migration, as expected for a provider swap).
- Updated `README.md` and this `prompts.md` entry to reflect Groq as the current provider, while leaving entry 11 above as an honest historical record rather than rewriting history.

### 13. Fix: wrong default model + a real-network-call test bug

**Prompt purpose:** After the migration, the developer configured a real `GROQ_API_KEY` and clicked "Analyze Fit" for the first real end-to-end run — and hit a genuine runtime error from Groq itself.

**Prompt used (actual):**
> "This is the error occur in the frontend when i click o the analyze fit: Resume Reviewer Agent call failed: 404 {"error":{"message":"The model llama-3.3-70b-versatile does not exist or you do not have access to it.","type":"invalid_request_error","code":"model_not_found"}} set this error"

**Result / outcome:**
- **Root cause of the model error:** the default model chosen during the migration (`llama-3.3-70b-versatile`) had been retired from Groq's actual hosted lineup, despite the documentation summary consulted at the time suggesting it was supported — a reminder that a docs *summary* is not the same as live ground truth. Fixed by querying Groq's real `GET https://api.groq.com/openai/v1/models` endpoint directly with the developer's real key (the key itself was never printed or logged) to get the actual current list of models available to that account, and switching the default in `groqModelClient.js` to `openai/gpt-oss-120b` — confirmed live, tool-use capable, and the exact model used in Groq's own official tool-calling example.
- **Second, more serious issue found while re-testing:** running the full suite after the model fix made a *real* network call to the real Groq API during `npm test` (visible directly in the hook's log output, and the test's expected status of `503` came back as an unexpected `200`). Root cause: `analyzeNotConfigured.test.js` relied on `delete process.env.GROQ_API_KEY` before loading the app to simulate "not configured" — but now that a real key exists in `.env`, `dotenv.config()` (triggered when `config/env.js` loads) simply repopulates the deleted variable from the file, silently defeating the test's isolation. This had been correct by coincidence only because no real key existed in `.env` before. Fixed by mutating the already-parsed, shared `config/env.js` export object directly (`delete env.GROQ_API_KEY` on the cached module, restored in `afterAll`) — the same "shared cached module object" technique already used for mocking `GroqModelClient`, which sidesteps dotenv entirely and is correct regardless of what's actually in `.env`.
- Re-ran the full suite: **40/40 passing**, and confirmed via the absence of any `ai_call` log line that the 503 now fires before the hook/skill are ever reached — no real network call.
- Updated `README.md`'s Tech Stack and Model Selection Rationale sections to name the corrected model and document why it changed.

### 14. New validation rule: dateApplied cannot precede a record's own creation date

**Prompt purpose:** After reviewing the application detail view together, the developer identified a genuine gap: nothing restricted `dateApplied` at all — any past or future date was accepted, and (separately, not yet acted on) the details view displayed it with a confusing time component. The developer asked specifically for the restriction: a record's `dateApplied` should never be earlier than the record's own creation date.

**Prompt used (actual):**
> "i want that you restrict that applying is always after the created at because it is not well for any project to employee applied for job before the job created"

**Result / outcome:**
- Interpreted as: `dateApplied` must not be *before* the record's creation date (comparing calendar dates, not raw timestamps, so a same-day entry — the common case — is never wrongly rejected).
- **Create**: added a Zod `.refine()` on `createApplicationSchema` comparing `dateApplied`'s UTC calendar date against `new Date()`'s UTC calendar date, since `createdAt` doesn't exist yet at validation time and will be ~now — self-contained, no DB access needed, consistent with the existing "at least one field" refine pattern already used on the update schema.
- **Update**: since the record's real `createdAt` already exists, added a check in `updateApplication` (controller) comparing an updated `dateApplied` against the fetched `existing.createdAt` — this genuinely needs DB state, so it couldn't live in the static Zod schema; a deliberate architectural split (DB-independent rules in Zod, DB-dependent rules in the controller), not an inconsistency.
- **Regression found and fixed**: three existing backend tests hardcoded `dateApplied: '2026-08-01'`, which had quietly become a past date relative to the current system date and would now fail the new rule. Replaced with a dynamically computed `TODAY` in each file rather than another fixed date, so this doesn't silently break again next month.
- Added 4 new backend tests (create rejects a past date / accepts today; update rejects a date before the record's `createdAt` / accepts on-or-after) — **44/44 backend tests passing**.
- **Frontend companion**: added a matching `min` attribute to the `dateApplied` date picker in `ApplicationForm.jsx` — today's date in create mode, the record's actual `createdAt` in edit mode — for immediate UX feedback; the backend remains the actual enforcement.
- **Second regression found and fixed**: jsdom enforces the native `min` constraint on form submission (the same way it enforces `required`, discovered earlier in this project) — two frontend tests that filled the date field with the same stale hardcoded `'2026-08-01'` value silently stopped submitting at all. Fixed the same way, with a dynamic `TODAY` computed in each test file. **19/19 frontend tests passing.**
- Updated `README.md`'s API Overview with the new `dateApplied` constraint. The separately-identified display bug (Date Applied shown with a misleading time component via `formatDateTime`) was **not** fixed here — only the restriction was requested this time.
