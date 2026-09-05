# Reflection — Building JobTrackr with Claude Code

Arbisoft AI-Focused Internship 2026, Web Track, Phase 3 — Weeks 5–8

## 1. Overview

JobTrackr is a full-stack job application tracker: a Postgres-backed Express API with Zod validation and full CRUD, and a small React/Vite frontend, extended with two AI agents — a Resume Reviewer that scores a resume against a job description, and a Follow-up Agent that drafts an editable follow-up email once an application has gone seven days without an update. Both agents run behind a shared `ModelClient` abstraction that can call either Groq or OpenRouter.

I built this project working with Claude Code as an AI pair-programmer for essentially the whole implementation — from the initial Express/Prisma scaffold through the agentic AI layer, the second provider, retry logic, an end-to-end test, Docker configuration, and the documentation itself. AI assistance let me move through a large scope (two real LLM-backed features, two providers, a full test suite, containerization) at a pace I couldn't have managed writing every line by hand, but the project only stayed correct because I treated the AI's output as a draft to verify, not a finished result to trust — a distinction that came up repeatedly and concretely, not just in the abstract.

## 2. What AI Did Well

- **Scaffolding and structure.** The initial Express + Prisma + PostgreSQL backend (routes, controllers, validators, middleware, error handling) and the matching React frontend were both scaffolded quickly and followed a consistent, conventional layout that stayed easy to extend for the rest of the project.
- **Agentic architecture.** The `ToolRegistry` / `ModelClient` / skill / hook structure was designed and implemented as a stub layer first (Week 6), then filled in with a real agent — and that separation held up: adding the second agent (Follow-up) and the second provider (OpenRouter) later required *zero* changes to the skill files or the registry, because the abstraction boundaries were right from the start.
- **Structured output validation.** Both AI features use forced tool/function calling plus a Zod schema on the way out, so a malformed model response is rejected with a clear `502` instead of silently reaching the user — this was designed in from the first agent and reused unchanged for the second.
- **Multi-provider integration.** Adding OpenRouter behind the existing `ModelClient` interface, and later building a model-comparison endpoint that calls both providers independently, both reused the existing skills completely unchanged — a real demonstration that the abstraction wasn't just theoretical.
- **Retry/error-handling design.** The retry layer correctly distinguishes transient failures (429, 5xx, connection errors) from non-retryable ones (bad key, bad request, and — importantly — a successfully-returned but schema-invalid response, which is a validation problem, not a network problem, and retrying it would only hide a bug).
- **Test generation.** Each feature came with a real Vitest/Supertest suite mocking only the AI provider boundary, including one genuine end-to-end test that exercises the real route → controller → registry → skill → validation chain rather than mocking at the HTTP layer.
- **Documentation assistance.** README.md and prompts.md were kept as living documents throughout, and — as described in section 3 — the AI was also the one that caught and fixed the cases where they'd drifted from reality.

## 3. Where AI Failed or Needed Correction

This is the part I paid the most attention to, because it's where "AI assistance" stopped being impressive and started requiring real oversight.

- **A test that silently made a real network call.** During the first Resume Reviewer implementation, `vi.mock()` against the Anthropic client didn't actually intercept the plain CommonJS `require()` chain used in this project. The test suite ran, and a real HTTP request reached Anthropic's API and came back with a 401 — caught only because that response was visible in the test output, not because the mock "looked correct" in the code.
- **A wrong assumption about model availability.** After migrating to Groq, the first default model (`llama-3.3-70b-versatile`) was chosen from documentation and looked reasonable, but once a real API key was used it returned a live `404 model_not_found` — the model had been retired from Groq's actual hosted lineup even though the docs summary suggested support. It was only fixed by querying Groq's live model list directly.
- **A real key exposed a second hidden bug.** Once a genuine `GROQ_API_KEY` existed in `.env`, a test that simulated "no API key configured" by deleting `process.env.GROQ_API_KEY` silently stopped working, because `dotenv` simply repopulated the deleted variable from the file on the next module load — and the test suite made a real network call during `npm test` as a result. This had been "correct" only by coincidence, since no real key existed when the test was first written.
- **Stale hardcoded dates broke tests weeks later.** A validation rule change (dateApplied cannot precede the record's own creation date) broke several existing tests that had a hardcoded past date baked in — a fragility that wasn't obvious until the calendar actually moved past that date.
- **Documentation drifted from the implementation.** For a stretch spanning several completed phases, `README.md` still stated "Follow-up Agent is not built yet" and cited old test counts, even though the feature existed and was tested. Nothing enforced that the README stayed in sync with the code — it took a deliberate audit pass to catch and correct it.
- **A false alarm that needed real evidence, not a guess.** I once reported "errors" in a `.dockerignore` file; the file's content was actually fine, and the real cause (VS Code's TypeScript language server misreading a plain ignore file) only became clear once I asked for — and got — the literal Problems-panel screenshot, instead of guessing and editing a file that wasn't broken.
- **Docker was never actually run.** The Dockerfiles and `docker-compose.yml` were written to a standard, well-known pattern, but Docker itself isn't installed in this development environment — so "the config looks right" and "the config works" were never allowed to be treated as the same claim; this remains an open, honestly-stated gap.

## 4. Human Verification and Judgment

None of the corrections above were caught by trusting a description of what the AI did — they were caught by checking the actual result:

- Running the backend and frontend test suites myself after every change, not accepting a reported pass count at face value.
- Reading `git status`/`git diff` before anything was staged, to confirm only the intended files changed and no secret or generated artifact slipped in.
- Testing real API behavior with `curl`/the running app, not just reading the code that was supposed to implement it (this is exactly how the Groq model-404 bug was actually discovered).
- Checking `prisma validate` / `prisma migrate status` directly rather than assuming a schema or migration change was safe.
- Treating "the AI says it works" and "I ran it and it worked" as different claims — the Docker section of the README says plainly that the containers were never actually built or started, because that's true, not because it's a comfortable thing to admit.
- Reviewing generated documentation against the actual routes/controllers/env config rather than assuming the two matched.

## 5. AI-Assisted Development Lessons

- AI can implement a feature quickly, but "implemented" and "verified" are not the same thing — every real bug in this project surfaced at the verification step, not the writing step.
- Narrow, explicit task boundaries (one phase at a time, with a stated list of what not to touch) produced far more reviewable diffs than open-ended requests would have.
- Small phases were genuinely easier to audit — it's much easier to check "did this one phase do what it claimed" than to review a large, multi-feature change after the fact.
- A test suite is what actually catches AI-introduced regressions; several of the bugs above were only visible because a specific test failed, not because anything looked wrong in a diff.
- Structured output (forced tool-calling + Zod validation) turned "trust the model's text" into "reject anything that doesn't match a schema" — a meaningfully more reliable contract for an AI-generated feature.
- Retry logic needs to know the difference between "the network hiccuped" and "the request was wrong" — retrying the wrong category either wastes calls or hides real bugs.
- Supporting two providers surfaces reliability questions that don't exist with one — provider-specific model availability, inconsistent free-tier tool-calling support, and the fact that "it works with Groq" says nothing about whether it works with OpenRouter until it's actually tested with a real key.
- Documentation rots the same way code does if nothing re-checks it against the implementation — the stale "Follow-up Agent not built yet" line is the clearest example of that in this project's own history.

## 6. What I Would Do Differently

- Define acceptance criteria (exact status codes, exact response shapes) before implementation, rather than resolving some of that ambiguity mid-phase, as happened with the model-comparison endpoint's partial-failure status codes.
- Get real credentials for every provider *before* building against it — the OpenRouter integration has never been exercised against a real API call, which is a gap that earlier credential planning would have closed.
- Get access to a Docker-capable environment earlier, so containerization could be verified as it was built instead of shipped as "should work, untested."
- Keep phases just as tightly scoped as they ended up being here, but decide the scope boundaries before starting rather than partway through.
- Add basic observability (even just structured logging conventions) earlier, rather than only having the AI-call logging hook and nothing else.
- Come back to frontend polish only after all core functionality was stable — which is roughly what happened here by circumstance, but would be worth doing on purpose next time.

## 7. Final Reflection

Working on JobTrackr changed how I think about "agentic AI" from a buzzword into a concrete set of decisions: what counts as a tool/skill, what a model client abstraction actually buys you when you add a second provider, and why forcing structured output matters more than writing a clever prompt. It also gave me a much more grounded view of AI-assisted software development generally — Claude Code was genuinely capable of scaffolding, implementing, and testing real features fast, but every serious bug in this project (a mocked test that wasn't actually mocked, a retired model that documentation didn't reflect, an env-var leak through dotenv, documentation that quietly went stale) was only caught because I insisted on running things myself instead of trusting a summary of what had supposedly been done. On the backend/API side, I came away with a much clearer sense of what a validation boundary is actually for, and how much a good error-handling middleware and consistent error shape simplifies everything built on top of it. On testing, I saw directly how a real test suite — not just code that "looks right" — is what makes AI-assisted changes safe to accept. On provider abstraction, building the same skill against two different LLM providers made the value of that abstraction concrete rather than theoretical. And on human-in-the-loop development specifically, the biggest lesson is one I'd give to anyone doing this: an AI assistant is a legitimate way to build software quickly, but only if a human is still the one running the tests, reading the diffs, and asking "did this actually happen" before believing that it did.
