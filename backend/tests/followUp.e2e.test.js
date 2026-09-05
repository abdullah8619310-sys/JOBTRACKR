// END-TO-END TEST (Week 7, Phase 7).
//
// Unlike the other Follow-up tests in this suite (followUp.test.js — the
// skill in isolation; followUpEndpoint.test.js — the endpoint's individual
// edge cases), this file exercises one complete, realistic user workflow
// through the REAL Express app and REAL database, start to finish:
//
//   create an application -> it goes stale -> the frontend's stale list
//   (GET /api/applications/stale) discovers it -> the user requests a
//   follow-up draft (POST /:id/follow-up) -> the real route, controller,
//   ToolRegistry lookup, draft_followup skill (incl. its retry wrapper and
//   prompt construction), and Zod output validation all run for real ->
//   the validated draft comes back in the HTTP response.
//
// The ONLY thing replaced is the concrete GroqModelClient class (the exact
// component that would otherwise make a real network call to Groq) — same
// technique already used elsewhere in this suite, since vi.mock does not
// reliably intercept this project's plain CommonJS require() chain. With
// GroqModelClient itself replaced, groq-sdk is never instantiated, so no
// real Groq (or OpenRouter — AI_PROVIDER defaults to 'groq' and is untouched
// here) request can occur.

process.env.GROQ_API_KEY = 'test-groq-key';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const ai = require('../src/ai');
const { followUp } = require('../src/ai/skills/followUp');

const mockGenerate = vi.fn();
const RealGroqModelClient = ai.GroqModelClient;

class MockGroqModelClient {
  constructor() {
    this.generate = mockGenerate;
  }
}

ai.GroqModelClient = vi.fn().mockImplementation(MockGroqModelClient);

const COMPANY = 'E2E FollowUp Test Co';
const TODAY = new Date().toISOString().slice(0, 10);

function daysAgoUtcMidnight(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

describe('E2E: stale-application discovery through a validated Follow-up Agent draft', () => {
  afterEach(() => {
    mockGenerate.mockReset();
  });

  afterAll(async () => {
    ai.GroqModelClient = RealGroqModelClient;
    await prisma.jobApplication.deleteMany({ where: { company: COMPANY } });
    await prisma.$disconnect();
  });

  it('walks a real application from creation -> stale discovery -> a validated follow-up draft, through the actual route/controller/registry/skill pipeline', async () => {
    // Step 1: real create, through the actual API and database. The create
    // endpoint only accepts today's dateApplied, so staleness is induced
    // afterward, same as the rest of this suite.
    const createRes = await request(app).post('/api/applications').send({
      company: COMPANY,
      role: 'Platform Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v2',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    await prisma.jobApplication.update({
      where: { id },
      data: { dateApplied: daysAgoUtcMidnight(10) },
    });

    // Step 2: real discovery, through the actual stale-applications endpoint
    // (route -> controller -> applications.service -> Prisma) — exactly
    // what the frontend's StaleApplications list calls.
    const staleRes = await request(app).get('/api/applications/stale');
    expect(staleRes.status).toBe(200);
    const staleEntry = staleRes.body.find((application) => application.id === id);
    expect(staleEntry).toBeDefined();
    expect(staleEntry.company).toBe(COMPANY);

    // Step 3: the AI boundary. Only GroqModelClient is mocked — the real
    // ToolRegistry, the real draft_followup skill, and real Zod validation
    // all still run between the controller and this mock.
    mockGenerate.mockResolvedValue({
      subject: 'Following up on my Platform Engineer application',
      body: 'Dear Hiring Team,\n\nI wanted to follow up on my application...',
    });

    // Step 4: the real request, through the real route/controller/skill chain.
    const followUpRes = await request(app).post(`/api/applications/${id}/follow-up`);

    // Step 5: the final HTTP response the user actually receives.
    expect(followUpRes.status).toBe(200);
    expect(followUpRes.body).toHaveProperty('subject');
    expect(followUpRes.body).toHaveProperty('body');
    expect(typeof followUpRes.body.subject).toBe('string');
    expect(typeof followUpRes.body.body).toBe('string');
    expect(followUpRes.body.subject.length).toBeGreaterThan(0);
    expect(followUpRes.body.body.length).toBeGreaterThan(0);

    // Proof the real draft_followup skill executed (built a real prompt
    // from this application's own data) rather than being bypassed.
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const skillInput = mockGenerate.mock.calls[0][0];
    expect(skillInput.prompt).toContain(COMPANY);
    expect(skillInput.prompt).toContain('Platform Engineer');
    expect(skillInput.tool.name).toBe('submit_follow_up_email');

    // Proof the ToolRegistry itself was used, not skipped: the registered
    // 'draft_followup' entry is the real skill function.
    expect(ai.toolRegistry.get('draft_followup')).toBe(followUp);
  });
});
