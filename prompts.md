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

---

## Week 7, Phase 1 — Stale Application Detection

**Prompt purpose:** Add the data/service layer a Follow-up Agent would need — identifying applications that have gone quiet — as a standalone step before any AI code, matching the same "prepare the data first" discipline used for `resumeText` in Week 6.

**Result / outcome:** Added `backend/src/services/applications.service.js` (`getStaleCutoffDate`, `findStaleApplications`, `isApplicationStale`), using a UTC-midnight cutoff date rather than a raw `now() - 7*24h` timestamp so "stale" resolves consistently regardless of what time of day the query runs. Registered `GET /api/applications/stale` **before** `GET /:id` in the router — otherwise Express would match `stale` as the `:id` param and the route would never be reached. The query selects only the six fields a later Follow-up Agent would need, not `resumeText`/`jobDescription`. Added `staleApplications.test.js` covering the exact 7-day boundary (not stale), 8 days (stale), ordering, and field selection. No AI call is involved in this phase at all.

## Week 7, Phase 2 — Follow-up Agent Skill

**Prompt purpose:** Build the second AI skill (`draft_followup`) using the exact same primitives already proven for the Resume Reviewer Agent — `ToolRegistry` registration, forced tool-calling through the existing `ModelClient` abstraction, Zod-validated structured output — rather than inventing a new pattern for the second agent.

**Result / outcome:** Added `backend/src/ai/skills/followUp.js` — the `draft_followup` skill, given only `company`/`role`/`dateApplied`/`resumeVersion` and explicitly instructed (in its system prompt) never to invent facts it wasn't given: no fabricated interview status, recruiter name, or prior correspondence. Added `backend/src/validators/followUp.validator.js` (`{ subject: string, body: string }`). Registered `draft_followup` in the shared `ToolRegistry` alongside `resume_review` in `registry.js`. Added `followUp.test.js` covering the skill's success path, prompt construction, and malformed-output rejection.

## Week 7, Phase 3 — Follow-up REST API

**Prompt purpose:** Wire the `draft_followup` skill to a real HTTP endpoint, gated on the application actually being stale.

**Result / outcome:** Added `generateFollowUp` to `applications.controller.js` and `POST /api/applications/:id/follow-up` to the router — mirroring `analyzeApplication`'s exact pattern (fetch application → skill lookup via `ToolRegistry` → logging hook → `modelClient`), but checking `isApplicationStale()` first: a non-stale application gets a `422` and the AI is never called. Added `followUpEndpoint.test.js` (404 not-found, 422 not-stale, the exact 7-day boundary, 502 on model failure, 200 success — and that it persists nothing) and `followUpNotConfigured.test.js` (503 when no API key is configured).

## Week 7, Phase 4 — Follow-up Frontend

**Prompt purpose:** Give the Follow-up Agent a lightweight, editable UI, matching the project's "demo-oriented, not production" frontend philosophy — list stale applications, let the user request a draft, and let them review/edit it before sending it themselves, entirely outside this app.

**Result / outcome:** Added `frontend/src/components/StaleApplications.jsx` (stale list, row selection, a "Generate Follow-up" button, loading/error states, and editable `subject`/`body` fields once a draft comes back) wired into `App.jsx`, plus `listStaleApplications`/`generateFollowUp` added to `applicationsApi.js`. Added `StaleApplications.test.jsx` and two new `App.test.jsx` cases for the full generate flow and its error path. Nothing is ever sent automatically — the draft is only ever displayed and left editable, exactly as designed in Phase 2.

---

## Week 7, Phase 5 — Multi-Model Routing (second LLM provider)

**Prompt purpose:** Add OpenRouter as a second `ModelClient` implementation alongside Groq, plus a simple `AI_PROVIDER=groq|openrouter` switch — no automatic fallback yet — while keeping both AI skills (`resume_review`, `draft_followup`) completely provider-agnostic.

**Prompt used (condensed from a detailed 10-step spec):** "Add OpenRouter as a second provider behind the existing ModelClient abstraction... skills should not know whether it's Groq or OpenRouter... do not hard-code an API key... verify the selected free model actually supports tool/function calling before assuming it does... add simple provider selection (AI_PROVIDER), no automatic fallback... test provider selection and the new client with mocks, no real API calls."

**Result / outcome:**
- **Verified OpenRouter's live model catalog** (`GET https://openrouter.ai/api/v1/models`) before picking a model, the same discipline used for the earlier Groq model fix — no `OPENROUTER_API_KEY` was available to empirically test with a real call, unlike Groq. Finding: none of the well-known free models (Llama, Gemini, Mistral, Qwen, DeepSeek) currently advertise `tools` support on the free tier; only smaller providers do. Selected `nvidia/nemotron-3.5-lightning:free`, documented the rotation risk clearly, and made the model overridable via a constructor option.
- Created `backend/src/ai/clients/openRouterModelClient.js`, mirroring `groqModelClient.js`'s exact shape (same forced-tool-call request, same JSON-string argument parsing) using the standard `openai` SDK pointed at OpenRouter's OpenAI-compatible base URL (OpenRouter's own recommended approach — no dedicated SDK exists).
- **Key design decision**: provider selection (`createModelClient()`) lives in `ai/index.js`, not the controller — the controller previously did `new ai.GroqModelClient(...)` directly, which is exactly the kind of provider-specific code the task said must not be in the controller. The factory reads `env.AI_PROVIDER` and returns the right client, so the controller now just calls `ai.createModelClient()` with zero provider knowledge.
- **Subtle correctness point**: the factory deliberately reads `module.exports.GroqModelClient`/`module.exports.OpenRouterModelClient` (a live lookup on its own exports) rather than closing over the destructured local imports — existing tests mock a provider by mutating `ai.GroqModelClient` on the shared, cached module object, and a plain closed-over local would silently miss that mutation, risking a real network call in tests.
- `resumeReview.js` and `followUp.js` needed **zero changes** — confirmed via a direct grep that neither file contains any "Groq"/"OpenRouter"/SDK reference.
- Added `openRouterModelClient.test.js` (mirrors `groqModelClient.test.js`) and `modelClientRouting.test.js` (provider selection: groq/openrouter/default/missing-key-per-provider/no-cross-provider-fallback) — **12 new tests**, none making a real network call (constructing a client never triggers I/O; only `.generate()` would, and these tests never call it).
- **Final verified status: 77/77 backend tests passing** (65 existing + 12 new), confirmed via one real HTTP call through the actual live endpoint (Groq, the default) that the refactor didn't regress production behavior. Prisma schema unchanged (`prisma validate` clean).
- Updated `.env`/`.env.example` (placeholders only — the real Groq key was never re-typed; the file was appended to via a shell redirect specifically to avoid ever reproducing it) and `README.md`'s env-var and Model Selection Rationale sections.

---

## Week 7, Phase 6 — Output Validation, Retry, and Safe Fallback

**Prompt purpose:** Harden the AI layer so a transient provider failure doesn't immediately surface as an error, and so invalid AI output is never silently accepted or replaced with a fabricated result.

**Prompt used (condensed):** "Add a small reusable retry mechanism (max 2 attempts) for transient AI failures, shared by Resume Reviewer and Follow-up, without duplicating retry code or building a complicated orchestration framework. Don't retry validation failures. Detect transient errors generically since Groq and OpenRouter may throw different shapes. Never fabricate a fake AI result on failure. Keep resumeReview.js/followUp.js free of any Groq/OpenRouter-specific code. Test with mocks only, no real API calls."

**Result / outcome:**
- **Verified the actual error shapes both SDKs throw** rather than guessing: `groq-sdk` and `openai` (used for OpenRouter) are both generated by the same tooling and export **identically-named** error classes (`RateLimitError`, `InternalServerError`, `APIConnectionError`, `AuthenticationError`, etc.) with the same `.status` property on real HTTP-response errors. This meant a single provider-agnostic check — `status === 429 || status >= 500`, or `constructor.name` matching the two connection-error classes — works for both without `retry.js` ever importing either SDK.
- Created `backend/src/ai/retry.js` (`withRetry`, `isRetryableError`, `MAX_ATTEMPTS = 2`). Wired into both skills with a one-line change each: `await withRetry(() => modelClient.generate({...}))`. Deliberately wraps **only** the model-client call, not the Zod validation step after it — a successfully-returned-but-malformed response never gets retried, since retrying it wouldn't fix a schema/prompt problem and could mask a real bug.
- `resumeReview.js`/`followUp.js` still contain **zero** provider references — confirmed via grep. No fake/fallback AI result is ever constructed anywhere; a failed retry propagates as a real, controlled error (`502`) exactly as before, just now only after a genuine second attempt for retryable failures.
- Added `retry.test.js` (7 tests: retryable/non-retryable classification, first-attempt success, retry-then-succeed, retry-then-fail, no-retry-on-non-retryable, never-exceeds-2-attempts) and `retryProviderIntegration.test.js` (4 tests, using the **real** `GroqModelClient`/`OpenRouterModelClient` classes with their SDKs' actual error classes, proving retry engages identically through both real concrete providers — not just a generic fake `modelClient`).
- **Final verified status: 93/93 backend tests passing** (77 existing + 16 new). Frontend untouched — the existing error format was already suitable, so no frontend changes were made or needed. Prisma schema unchanged.
- Updated `README.md`'s Resume Reviewer Agent section with a short retry/validation-reliability note.

---

## Week 7, Phase 7 — End-to-End Test

**Prompt purpose:** Add the Week 7 "at least 1 end-to-end test" deliverable — one test genuinely exercising the complete Follow-up Agent pipeline across layers, distinct from the isolated unit/endpoint tests already in the suite.

**Prompt used (condensed):** "Add an E2E test verifying an important complete user workflow. Prefer the Follow-up Agent since it's the newest feature: create an application, make it stale using the existing test setup, call `POST /:id/follow-up`, mock only the ModelClient/AI boundary, and verify the request actually travels through the route, controller, stale-application check, ToolRegistry, `draft_followup` skill, ModelClient, validation, and the HTTP response. Do not introduce Playwright/Cypress unless genuinely required — a Supertest-based backend E2E test is acceptable. Do not duplicate all the existing unit tests."

**Result / outcome:** Added `backend/tests/followUp.e2e.test.js` — one test that creates a real application, backdates it to stale directly via Prisma, discovers it through the real `GET /api/applications/stale` endpoint (the same call the frontend's `StaleApplications` list makes), then generates a follow-up through the real `POST /:id/follow-up` route → controller → `ToolRegistry` → `draft_followup` skill → Zod validation chain, with only the concrete `GroqModelClient` class mocked (the same live-property-swap technique already used elsewhere in the suite). Assertions confirm the mock was actually reached with a real prompt built from that application's own data, and that `ToolRegistry.get('draft_followup')` resolves to the real, unbypassed skill function. **94/94 backend tests passing** (93 existing + 1 new), frontend unaffected, Prisma untouched.

## Week 7, Phase 8 — Docker Containerization

**Prompt purpose:** Satisfy the Week 7 deployment requirement with the simplest reliable local option — Docker Compose (Postgres + backend + frontend) — without introducing cloud infrastructure or changing application architecture.

**Prompt used (condensed from a detailed 8-point spec):** "Create a simple containerized setup for local demonstration. Backend Dockerfile: install dependencies, start the existing Express server, receive env vars normally, never bake in API keys or `.env`. Frontend Dockerfile: build with Vite, decide how to serve the build (vite preview / nginx / another simple server) after inspecting the current Vite config. PostgreSQL via Compose with env-var-driven credentials. Make Frontend → Backend → PostgreSQL networking actually work, remembering `localhost` means something different inside a container. Update the README with simple Docker instructions. Actually run `docker compose build`/`up` if Docker is available on this machine — do not claim it works merely because the files look correct."

**Result / outcome:** Added `backend/Dockerfile` (single-stage, `npm ci` including the `prisma` devDependency — needed both for `prisma generate` at build time and `prisma migrate deploy` at container start; flagged as a deliberate deviation from "production dependencies only" since there's no way to run migrations at startup otherwise without a heavier multi-stage `node_modules` copy). Added `frontend/Dockerfile` (2-stage: Vite build, then nginx — `vite preview` was deliberately not used, since Vite's own docs describe it as a local-preview tool, not a production server) and `frontend/nginx.conf`, both `.dockerignore` files, root `docker-compose.yml`, and root `.env.example`. Correctly distinguished the two different kinds of "networking" the task warned about: frontend → backend happens in the **browser** (client-side `fetch`), so `VITE_API_BASE_URL` must be the backend's *published host port*, baked in at image-build time since Vite inlines `VITE_`-prefixed vars — not the internal Docker service name; only backend → database is real container-to-container networking (`DATABASE_URL` pointing at the `db` service name). **Docker itself is not installed on this development machine** (checked both Bash and PowerShell) — `docker compose build`/`up` could not actually be run, and this was reported plainly as unverified rather than claimed as working. Ran everything that *could* be verified instead: full backend/frontend test suites, `npm run build`, and `prisma validate` — all passed, confirming no regression from adding these files.

---

## Week 7, Phase 9 — Performance: `dateApplied` Index

**Prompt purpose:** Satisfy the Week 7 performance requirement (caching/batching/query optimization) with one small, genuine improvement rather than new infrastructure.

**Result / outcome:**
- Inspected every DB query in the app for filter/sort columns lacking an index. `findStaleApplications()` (backing `GET /api/applications/stale`) was the only one filtering (`WHERE dateApplied < cutoff`) and sorting (`ORDER BY dateApplied ASC`) on a column with no index — `JobApplication` only had `@@index([status])`. Everything else already looked appropriate (that same query already `select`s only the six fields it needs, not `resumeText`/`jobDescription`; the frontend fetches the stale list once on mount, no polling).
- Added `@@index([dateApplied])` to `prisma/schema.prisma` and generated/applied migration `add_date_applied_index` (`CREATE INDEX` only — no data change, no behavior change, the 7-day stale rule is untouched).
- `prisma generate` hit the same Windows `EPERM` file-lock issue seen in an earlier session (`query_engine-windows.dll.node`), this time caused by the developer's own running `nodemon`/Vite dev processes. Left it as-is rather than killing those processes — an index addition doesn't change the Prisma Client's generated types/API, so the already-generated client keeps working correctly, confirmed by the full test suite still passing.
- **Final verified status: 94/94 backend tests passing, 36/36 frontend tests passing** (both unchanged from before this phase). `prisma validate` clean.
- Updated `README.md` with a short new "Performance" section explaining the index and why.

---

## Week 7, Phase 10 — Documentation / Runbook

**Prompt purpose:** Bring `README.md` and `prompts.md` up to date with everything actually implemented across Week 7 — the README still opened with "Status: Week 6 — Follow-up Agent is not built yet" and cited 40/40 backend / 19/19 frontend test counts, despite Phases 1-9 being complete and verified at 94/94 / 36/36.

**Prompt used (condensed from a detailed spec):** "Create a concise developer runbook covering Project Overview, Architecture, Main Features, Environment Configuration, Local Development, Testing, Docker, an API Quick Reference, AI Provider Routing, and Limitations. Inspect the actual current routes/controllers/validators/services first — don't document functionality that doesn't exist or invent request/response fields. Keep the Docker section honest that its runtime hasn't been verified on this machine. Update `prompts.md` so Phases 1-10 are all represented, without rewriting historical entries unnecessarily."

**Result / outcome:**
- Read the actual current `README.md`/`prompts.md` plus every relevant source file before editing — `applications.validator.js`, `applications.service.js`, `routes/index.js`, `health.routes.js` — specifically to confirm the health response shape, the stale-endpoint response shape, and the router registration order, rather than assuming any of it.
- Rewrote the status banner, added a **Project Overview** section (the problem JobTrackr solves, its three-step workflow) and a **Main Features** checklist, updated the **Architecture** diagram to show both skills and both providers (it previously showed only the Groq/`resume_review` path), updated **Folder Structure** to include every file added since Week 6 (`retry.js`, `followUp.js`, `openRouterModelClient.js`, `services/`, the Docker files), and added dedicated **Stale Application Detection**, **Follow-up Agent**, and **AI Provider Routing** sections.
- Fixed stale/incorrect claims: the "Follow-up Agent is not built yet" line, the 40/40 and 19/19 test counts, and the missing `GET /stale` and `POST /:id/follow-up` rows (plus the latter's failure-mode table) in the **API Overview**.
- Added an explicit, prominent caveat at the top of the **Docker** section stating `docker compose build`/`up` has not actually been run on this machine (Docker isn't installed here) — never implying it works from the files alone.
- Rewrote **Current Limitations**: dropped the now-false "no Follow-up Agent" line, kept every limitation still genuinely true (no auth, no memory layer, no persisted analysis history, no pagination, etc.), and added the ones this phase specifically asked for (Docker untested here, OpenRouter unverified with a real key, frontend intentionally lightweight, follow-up drafts editable/not persisted/not sent).
- Backfilled `prompts.md` entries for **Phases 1-4** (all predate this session — no verbatim original prompt is available for them, so the "Prompt used" quote block was left out for those, consistent with how this file already handles earlier entries with no recorded quote, e.g. the Week 6 gap-analysis entries) and **Phases 7-8** (both from this session, so their actual condensed task prompts are quoted).
- No application code, Prisma schema, or Docker configuration was changed in this phase (Docker files were only referenced, not edited).
- **Final verified status: 94/94 backend tests passing, 36/36 frontend tests passing** — both unchanged, as expected for a documentation-only phase.

---

## Week 7, Phase 11 — Live Multi-Model Comparison

**Prompt purpose:** Satisfy the remaining Week 7 deliverable — sending the same AI task to 2+ configured providers and comparing their structured outputs — clearly distinct from the existing single-provider `AI_PROVIDER` routing, and without rewriting any existing AI architecture.

**Prompt used (condensed from a detailed spec):** "Inspect the existing ModelClient/registry/skills first and report the minimum design before implementing. Reuse the existing Resume Reviewer task/skill rather than duplicating its prompt. Send the same input independently to Groq and OpenRouter, label each result by provider/model, keep the existing structured-output validation and retry behavior, and represent one provider's failure as its own error entry rather than silently substituting the other's result or fabricating data. No automatic fallback. Don't persist results. If `OPENROUTER_API_KEY` isn't configured, don't fake a live comparison — report that honestly and still test everything that can be tested safely."

**Result / outcome:**
- Confirmed directly (not assumed) that `OPENROUTER_API_KEY` is not configured in this environment (`GROQ_API_KEY` is); reported this before implementing, per the instructions.
- Added one new controller function, `compareModels` (`applications.controller.js`), and one new route, `POST /api/applications/:id/compare-models` — no new AI module, no new Zod schema, no changes to `resumeReview.js`, `retry.js`, `toolRegistry.js`, `modelClient.js`, or either concrete client. It reuses the `resume_review` skill completely unchanged (same prompt, same forced tool-calling, same `resumeReviewOutputSchema` validation, same `withLogging` hook, and — since the skill itself calls it — the same `withRetry` per provider).
- **Key design decision**: `compareModels` deliberately bypasses `ai.createModelClient()`, which is single-provider by design (`AI_PROVIDER`-driven) and cannot return two clients at once. Instead it constructs `ai.GroqModelClient`/`ai.OpenRouterModelClient` directly — both were already exported specifically for this kind of direct construction (see `registry.js`'s own comment) — so `AI_PROVIDER` routing itself needed zero changes and remains exactly as before.
- **Response shape**: `{ applicationId, results: [{ provider, model, status: 'success'|'error', result? , error? }, ...] }`, one entry per provider, run concurrently via `Promise.all`. `model` is read back from the real constructed client (`modelClient.model`) rather than hardcoded, so it always reflects the actual default/override in use.
- **Status-code design decision** (flagged explicitly, since the brief listed 200/404/422/502/503 without fully resolving the partial-failure case): `404`/`422` mirror `/analyze` exactly (missing application / missing resume text); `503` only when *neither* provider is configured (nothing to compare); `200` whenever at least one provider produced a real result, even if the other is a labeled error (a partial comparison is still a useful, honest response — better than losing the whole comparison to a single provider's outage or missing key); `502` reserved for the case where every configured provider's call genuinely failed, mirroring `/analyze`'s existing 502 semantics.
- Added `backend/tests/compareModels.test.js` (9 tests, mocking both `GroqModelClient` and `OpenRouterModelClient` via the same live-property-swap technique used throughout this suite): 404, 422, 503 (neither configured), identical-task-sent-to-both + correct labels, one-provider-failure isolation (no fake data, other provider unaffected), 502-when-all-fail, missing-single-provider-config handled as a labeled error without touching the other, malformed-output rejection, and that a transient failure is still retried per provider before the comparison gives up on it (proving existing retry behavior survived unchanged).
- **Final verified status: 103/103 backend tests passing** (94 existing + 9 new); frontend untouched (this phase is backend-only) — reran the full frontend suite anyway as a sanity check, still 36/36.
- Updated `README.md`: added `POST /:id/compare-models` to the API table and its own failure-mode table, added a new **Live Multi-Model Comparison** section explicitly distinguishing routing (pick one provider) from comparison (query both at once), and noted plainly that no real OpenRouter call has actually been made — only mocked — for the same reason documented since Phase 5 (no key available in this environment).

---

## Post-Week 8 — Reversal: dateApplied Restriction Removed

**Prompt purpose:** Revisit the `dateApplied`-cannot-precede-creation rule added back in Week 6 entry 14. The developer clarified they actually want the calendar to allow **any** date, including past ones, in both create and edit modes — reversing that earlier rule rather than just re-verifying it (an initial exchange had briefly gone the other way, ending in a test-coverage-only change for the *existing* restrictive behavior, before the developer clarified the real intent here).

**Prompt used (actual, lightly trimmed):** "do one change in the jobtracker, the issue of calendar to select the date is allow the user to select any date even from the past days." Follow-up clarification, when asked whether this should apply to create only or both create and edit: "Both creating and editing — no restriction at all."

**Result / outcome:**
- Confirmed a frontend-only change would not have been sufficient: the backend independently rejected a past `dateApplied` regardless of the frontend calendar, so both layers needed to change together.
- **Backend**: removed the `.refine()` on `createApplicationSchema` (`backend/src/validators/applications.validator.js`) that required `dateApplied >= today`, and removed the `toUtcDateOnly`-based check in `updateApplication` (`backend/src/controllers/applications.controller.js`) that required `dateApplied >= existing.createdAt`. Removed the now-dead `toUtcDateOnly` helper and its export entirely (confirmed via grep it wasn't used anywhere else — `applications.service.js` only *mentioned* it in a comment, never imported it).
- **Frontend**: removed the `minDateApplied` computation and the `min` attribute from the date input in `ApplicationForm.jsx` — the calendar no longer restricts any date in either create or edit mode.
- **Tests updated** (not just added — the old tests actively asserted the now-reversed behavior and had to change): `backend/tests/applications.test.js`'s `describe('dateApplied cannot be before...')` block (4 tests) replaced with 3 tests asserting past dates are now accepted on both create and update. `frontend/src/components/ApplicationForm.test.jsx`'s equivalent block (5 tests, added in the prior session) replaced with 4 tests asserting no `min` attribute exists and that a past date is accepted in both modes. Corrected now-stale comments referencing the old rule in `App.test.jsx` and `applications.test.js`.
- **Final verified status: 102/102 backend tests passing** (103 - 4 removed + 3 new), **40/40 frontend tests passing** (41 - 5 removed + 4 new — the 41 itself was from the immediately preceding session's test-coverage addition). Frontend production build still compiles.
- Updated `README.md`'s API Overview paragraph (removed the now-false "dateApplied can never be before the record's own creation date" claim) and the Testing section's counts (102/40, not 103/36) — the exact kind of documentation drift this project has already been burned by once (see the Week 7 Phase 10 entry).
