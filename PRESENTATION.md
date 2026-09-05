# JobTrackr — Final Presentation (Source Material)

Source content for building the actual slide deck (PowerPoint/Google Slides). Structure: **Problem → Solution → Architecture → AI Features → Demonstration → Testing/Reliability → Learnings → Conclusion**. 18 slides, target ~15 minutes of slides + a 5-minute live demo ≈ 20 minutes total.

All facts below are drawn directly from the actual implemented project (`README.md`, `prompts.md`, `REFLECTION.md`) — nothing is invented, and unverified areas (OpenRouter live calls, Docker runtime) are stated honestly rather than implied as complete.

---

## Slide 1 — Title
**Time: 0.5 min**

**Slide content:**
- **JobTrackr — AI-Assisted Job Application Tracker & Follow-up Assistant**
- Muhammad Abdullah
- Arbisoft AI-Focused Internship 2026 — Web Track, Phase 3
- Final Presentation — Week 8

**Speaker notes:** Introduce yourself briefly and state that this is the final presentation for a project built over Weeks 5–8 of the internship, combining a practical tracking tool with two real AI features.

---

## Slide 2 — The Problem
**Time: 1 min**

**Slide content:**
- Job applications pile up fast and become hard to track by hand.
- Important follow-ups get forgotten once an application goes quiet.
- Tailoring a resume to each job description takes real time.
- It's hard to judge how well a resume actually matches a job description.

**Speaker notes:** Keep this human and relatable — describe the everyday experience of applying to many jobs, losing track of what was sent where, and not knowing whether a resume is actually a good match before applying.

---

## Slide 3 — Project Goal
**Time: 0.5 min**

**Slide content:**
- Goal: one tool that tracks applications **and** actively helps with the tedious parts.
- Core workflow:
  **Application Tracking → Stale Application Detection → Resume Review → Follow-up Assistance**

**Speaker notes:** Frame this as the roadmap for the whole talk — every following slide maps onto one step of this workflow.

---

## Slide 4 — Solution Overview
**Time: 1 min**

**Slide content:**
- Full Job Application CRUD (create/view/update/delete)
- Automatic stale-application detection (7-day rule)
- AI Resume Reviewer — match score, missing keywords, suggestions
- AI Follow-up Agent — drafts an editable follow-up email
- Two AI providers (Groq, OpenRouter) behind one shared abstraction
- Structured validation, retry logic, and error handling throughout

**Speaker notes:** This is the "what we built" summary slide — a quick preview before going deeper into architecture and each AI feature individually.

---

## Slide 5 — Technology Stack
**Time: 0.5 min**

**Slide content:**
- **Frontend:** React 19, Vite
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL, Prisma ORM
- **Validation/Testing:** Zod, Vitest, Supertest, React Testing Library
- **AI:** Groq (`groq-sdk`), OpenRouter (via the `openai` SDK pointed at OpenRouter's API)

**Speaker notes:** Mention that every technology listed is actually in use — nothing here is aspirational. Note that OpenRouter integration uses the standard `openai` SDK rather than a dedicated OpenRouter package, since none exists.

---

## Slide 6 — System Architecture
**Time: 1.5 min**

**Slide content:**
- Application flow:
  **React Frontend → REST API → Express Controllers/Services → Prisma → PostgreSQL**
- AI flow:
  **Controller → ToolRegistry → AI Skill → ModelClient → Provider Client (Groq/OpenRouter) → LLM**
- Skills never know which provider is active; providers never know which skill called them.

**Speaker notes:** Explain the two flows as parallel: normal CRUD never touches the AI layer at all, and the AI layer is a clean, swappable pipeline. Emphasize that this separation is what let a second AI feature and a second provider be added later without touching the first agent's code.

---

## Slide 7 — Core Application Management
**Time: 0.5 min**

**Slide content:**
- Create, view, update, delete job applications
- Tracks company, role, status, date applied, resume version, resume text, job description
- Zod validation on every write; consistent error responses

**Speaker notes:** Frame this as the necessary foundation — the AI features have nothing to analyze without real application data captured first.

---

## Slide 8 — Stale Application Detection
**Time: 0.5 min**

**Slide content:**
- Rule: an application is stale when `dateApplied` is **strictly older than 7 calendar days**
- Dedicated `GET /api/applications/stale` endpoint
- Backed by a database index on `dateApplied` for an efficient date-range query
- Returns only the fields needed for the list — no resume text/job description payload

**Speaker notes:** Note this is a pure database query — no AI call is involved in detecting staleness; AI only gets involved once the user asks for a follow-up draft.

---

## Slide 9 — Resume Reviewer Agent
**Time: 1.5 min**

**Slide content:**
- **Input:** resume text + job description
- **Output (structured):** match score (0–100), missing keywords, 2–3 suggestions
- Model is forced to call a function/tool — never free-form chat text
- Output is validated against a schema before it's ever returned to the user

**Speaker notes:** This is a headline AI slide — explain that the output isn't "the model wrote some text we hope is useful," it's a schema the model is required to fill in, and anything that doesn't match the schema is rejected rather than shown to the user.

---

## Slide 10 — Follow-up Agent
**Time: 1.5 min**

**Slide content:**
- **Input:** stale application context (company, role, date applied, resume version)
- **Output:** an editable email subject + body
- The AI is told never to invent facts it wasn't given — no fake recruiter names, no fake interview status
- **The draft is never sent automatically** — the user reviews and sends it themselves

**Speaker notes:** Emphasize the safety framing here explicitly: this agent drafts, it never acts. That's a deliberate design choice, not a missing feature.

---

## Slide 11 — Multi-Model AI Architecture
**Time: 1 min**

**Slide content:**
- Shared `ModelClient` abstraction behind both AI features
- Two concrete providers: Groq and OpenRouter, selected via `AI_PROVIDER`
- A model-comparison endpoint sends the same resume-review task to both providers at once and returns both labeled results
- **Honest status:** Groq has been used with a real API key; OpenRouter has been implemented and tested with mocks only — no real OpenRouter API key was available to verify a live call

**Speaker notes:** Be direct about this distinction if asked — the code path for OpenRouter is identical to Groq's, it has simply never been exercised against OpenRouter's real API in this environment.

---

## Slide 12 — Reliability & Guardrails
**Time: 1.5 min**

**Slide content:**
- Every AI response is Zod-validated before use — no fabricated fallback, ever
- Retry: transient failures (rate limits, 5xx, connection errors) retried once, max 2 attempts total
- Non-retryable: bad API key, bad request, or a schema-invalid response (retrying wouldn't fix a bad prompt/schema)
- Missing API key → clean `503`; provider/validation failure → clean `502`
- AI output is treated as **untrusted until validated**

**Speaker notes:** This is one of the slides worth spending real time on — it's the difference between "calling an LLM" and "building a reliable feature around an LLM." Walk through one concrete failure path (e.g., a malformed response) end to end.

---

## Slide 13 — Testing
**Time: 0.5 min**

**Slide content:**
- **Backend:** 103/103 tests passing
- **Frontend:** 36/36 tests passing
- **Total: 139 tests passing**
- Covers CRUD, stale detection, both AI skills, provider routing, retry logic, model comparison, and one full end-to-end workflow test
- No automated test ever calls a real AI provider — both providers are mocked at the client boundary

**Speaker notes:** Mention the E2E test specifically: it walks a real application through creation, going stale, discovery, and follow-up generation through the actual route/controller/registry chain, with only the AI client mocked.

---

## Slide 14 — Performance & Engineering Quality
**Time: 0.5 min**

**Slide content:**
- Added a database index on `dateApplied` for the stale-application query (filter + sort)
- Clean separation between provider clients, skills, and controllers
- Consistent Zod validation and error handling across every endpoint
- Frontend kept intentionally lightweight — no unnecessary libraries

**Speaker notes:** No benchmark numbers are claimed here — the index is a correct, standard optimization for the query pattern, not a measured before/after number.

---

## Slide 15 — Docker / Deployment Status
**Time: 0.5 min**

**Slide content:**
- Dockerfiles for backend and frontend, plus a `docker-compose.yml` (PostgreSQL + backend + nginx-served frontend), are implemented
- Configuration follows standard, well-established patterns for this stack
- **Docker was not available in the development environment — the containers were never actually built or run**
- This is a real, open item, not a completed deployment

**Speaker notes:** Be completely direct here if asked: this is implemented but unverified, full stop — not "deployed," not "working in production."

---

## Slide 16 — Challenges & AI Lessons
**Time: 1 min**

**Slide content:**
- A test mock didn't actually intercept a real API call — caught by an unexpected real network request during testing
- A model referenced in documentation had actually been retired — only found by querying the provider's live model list
- An environment-variable leak (via `dotenv`) let a "not configured" test make a real network call
- Documentation silently drifted from the implementation for a time (a feature was marked "not built" after it was actually built)
- Lesson: AI-generated work is only as trustworthy as the verification behind it

**Speaker notes:** Use these as genuine engineering stories, not as criticism of the tools used — each one was only caught by actually running the project and checking real output, not by reading code and assuming it was correct.

---

## Slide 17 — What I Learned
**Time: 0.5 min**

**Slide content:**
- Agentic AI architecture: tools/skills, structured output, provider abstraction
- AI-assisted development speeds up implementation but not verification
- Backend/API engineering: validation boundaries, consistent error handling
- Testing AI-generated code requires mocking at the right boundary
- Human-in-the-loop review is what actually keeps an AI-assisted project correct

**Speaker notes:** Keep this tight — it's a summary slide, the detail already landed on Slide 16.

---

## Slide 18 — Conclusion / Future Work
**Time: 0.5 min**

**Slide content:**
- JobTrackr combines practical application tracking with real AI assistance
- Reliability and validation were treated as first-class concerns, not an afterthought
- **Future work (not yet implemented):**
  - Actual cloud deployment
  - Live OpenRouter verification with a real API key
  - Authentication/authorization
  - Persisted AI analysis history
  - Richer dashboard/analytics, pagination
  - Further frontend polish

**Speaker notes:** Explicitly say these are future work, not partially-done features — closes the talk honestly and transitions into the live demo.

---

# 5-Minute Live Demo Plan

Runs on the **verified Groq path** only — no dependency on OpenRouter live access. Do not reveal `.env` contents or API keys on screen at any point (keep the terminal/editor tab with `.env` open closed before sharing the screen).

### 0:00–0:30 — Introduce the problem
Briefly restate the scenario: applications pile up, follow-ups get forgotten, resume fit is hard to judge — set up what the demo is about to show.

### 0:30–1:15 — Show JobTrackr
Open the running app, show the main application list and the "Add Application" form. Point out the CRUD basics quickly — this isn't the interesting part, just the foundation.

### 1:15–2:30 — Resume Reviewer
Select an existing application with resume text and a job description saved. Click "Analyze Fit." While it loads, narrate that this is a real call to Groq behind the scenes. Show the returned match score, missing keywords, and suggestions once it comes back.

### 2:30–3:45 — Follow-up Agent
Navigate to the Stale Applications list, select a stale application, click "Generate Follow-up." Show the returned subject/body. Explicitly point out the editable fields and state clearly: this is never sent automatically — the user would copy this into their own email client.

### 3:45–4:30 — Reliability / architecture
Briefly narrate (no need to show code) that every AI response just shown was validated against a schema before being displayed, and that this same flow can run through either Groq or OpenRouter via one switch — without touching the underlying feature code.

### 4:30–5:00 — Close
Return to the application list, summarize: one tool, two real AI features, validated and retried reliably, nothing sent or acted on automatically. Thank the audience and open for questions.
