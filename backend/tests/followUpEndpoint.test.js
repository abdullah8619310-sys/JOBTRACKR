process.env.GROQ_API_KEY = 'test-groq-key';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const ai = require('../src/ai');

// Same technique as analyze.test.js: replace GroqModelClient on the shared,
// cached `ai` module object via a live property lookup in the controller,
// rather than relying on vi.mock against a plain CommonJS require() chain.
const mockGenerate = vi.fn();
const RealGroqModelClient = ai.GroqModelClient;

class MockGroqModelClient {
  constructor() {
    this.generate = mockGenerate;
  }
}

ai.GroqModelClient = vi.fn().mockImplementation(MockGroqModelClient);

const TODAY = new Date().toISOString().slice(0, 10);
const COMPANY = 'FollowUp Endpoint Test Co';

function daysAgoUtcMidnight(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

// Same pattern used in staleApplications.test.js: create via the API with
// today's date (the only value the create-time validation allows), then
// backdate dateApplied directly via Prisma to simulate an application that
// was genuinely created N days ago.
async function createApplicationAgedDays(daysAgo, overrides = {}) {
  const createRes = await request(app)
    .post('/api/applications')
    .send({
      company: COMPANY,
      role: 'Backend Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
      ...overrides,
    });

  const id = createRes.body.id;

  await prisma.jobApplication.update({
    where: { id },
    data: { dateApplied: daysAgoUtcMidnight(daysAgo) },
  });

  return id;
}

describe('POST /api/applications/:id/follow-up', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  afterAll(async () => {
    ai.GroqModelClient = RealGroqModelClient;
    await prisma.jobApplication.deleteMany({ where: { company: COMPANY } });
    await prisma.$disconnect();
  });

  it('returns 404 when the application does not exist', async () => {
    const res = await request(app).post('/api/applications/does-not-exist/follow-up');

    expect(res.status).toBe(404);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns a 4xx and does not call the AI skill when the application is not stale (3 days old)', async () => {
    const id = await createApplicationAgedDays(3);

    const res = await request(app).post(`/api/applications/${id}/follow-up`);

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/stale/i);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('treats an application exactly 7 days old as not stale (boundary) and does not call the AI skill', async () => {
    const id = await createApplicationAgedDays(7);

    const res = await request(app).post(`/api/applications/${id}/follow-up`);

    expect(res.status).toBe(422);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 502 when the AI call fails, without returning a fake draft', async () => {
    const id = await createApplicationAgedDays(10);
    mockGenerate.mockRejectedValue(new Error('network error'));

    const res = await request(app).post(`/api/applications/${id}/follow-up`);

    expect(res.status).toBe(502);
    expect(res.body).not.toHaveProperty('subject');
    expect(res.body).not.toHaveProperty('body');
  });

  it('returns 200 with a validated { subject, body } draft for a stale application and persists nothing', async () => {
    const id = await createApplicationAgedDays(10);
    const before = await prisma.jobApplication.findUnique({ where: { id } });

    mockGenerate.mockResolvedValue({
      subject: 'Follow-up on Backend Engineer Application',
      body: "Dear Hiring Team,\n\nI'm following up regarding my application...",
    });

    const res = await request(app).post(`/api/applications/${id}/follow-up`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      subject: 'Follow-up on Backend Engineer Application',
      body: "Dear Hiring Team,\n\nI'm following up regarding my application...",
    });
    expect(mockGenerate).toHaveBeenCalledTimes(1);

    // Confirm the endpoint made no database write of any kind.
    const after = await prisma.jobApplication.findUnique({ where: { id } });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('passes the application\'s own company, role, dateApplied, and resumeVersion into the skill', async () => {
    const id = await createApplicationAgedDays(10, { role: 'Staff Engineer', resumeVersion: 'v3' });
    mockGenerate.mockResolvedValue({ subject: 'Subject', body: 'Body' });

    await request(app).post(`/api/applications/${id}/follow-up`);

    const skillInput = mockGenerate.mock.calls[0][0];
    expect(skillInput.prompt).toContain(COMPANY);
    expect(skillInput.prompt).toContain('Staff Engineer');
    expect(skillInput.prompt).toContain('v3');
  });
});
