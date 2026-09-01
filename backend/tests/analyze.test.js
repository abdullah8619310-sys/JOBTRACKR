process.env.GROQ_API_KEY = 'test-groq-key';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const ai = require('../src/ai');

// The controller does `new ai.GroqModelClient(...)` via a live property
// lookup on this exact cached module object, so replacing the property here
// swaps it out everywhere without any real network call ever happening.
const mockGenerate = vi.fn();
const RealGroqModelClient = ai.GroqModelClient;

class MockGroqModelClient {
  constructor() {
    this.generate = mockGenerate;
  }
}

ai.GroqModelClient = vi.fn().mockImplementation(MockGroqModelClient);

// dateApplied can never be before a record's own creation date, so tests
// must use "today", not a fixed past date that will eventually go stale.
const TODAY = new Date().toISOString().slice(0, 10);

async function createTestApplication(overrides = {}) {
  const res = await request(app)
    .post('/api/applications')
    .send({
      company: 'Analyze Test Co',
      role: 'Backend Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v1',
      resumeText: 'Experienced backend engineer skilled in Node.js.',
      jobDescription: 'Looking for a backend engineer with Node.js and Kubernetes skills.',
      ...overrides,
    });

  return res.body.id;
}

describe('POST /api/applications/:id/analyze', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  afterAll(async () => {
    ai.GroqModelClient = RealGroqModelClient;
    await prisma.jobApplication.deleteMany({ where: { company: 'Analyze Test Co' } });
    await prisma.$disconnect();
  });

  it('returns 404 when the application does not exist', async () => {
    const res = await request(app).post('/api/applications/does-not-exist/analyze');

    expect(res.status).toBe(404);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 422 when the application has no resume text', async () => {
    const id = await createTestApplication();
    await prisma.jobApplication.update({ where: { id }, data: { resumeText: null } });

    const res = await request(app).post(`/api/applications/${id}/analyze`);

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/resume text/i);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 502 when the model/API call fails', async () => {
    const id = await createTestApplication();
    mockGenerate.mockRejectedValue(new Error('network error'));

    const res = await request(app).post(`/api/applications/${id}/analyze`);

    expect(res.status).toBe(502);
  });

  it('returns 502 when the model returns malformed output', async () => {
    const id = await createTestApplication();
    mockGenerate.mockResolvedValue({ matchScore: 50 });

    const res = await request(app).post(`/api/applications/${id}/analyze`);

    expect(res.status).toBe(502);
  });

  it('returns 200 with validated structured output on success', async () => {
    const id = await createTestApplication();
    mockGenerate.mockResolvedValue({
      matchScore: 78,
      missingKeywords: ['Kubernetes'],
      suggestions: ['Mention container orchestration experience.', 'Add measurable impact.'],
    });

    const res = await request(app).post(`/api/applications/${id}/analyze`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matchScore: 78,
      missingKeywords: ['Kubernetes'],
      suggestions: ['Mention container orchestration experience.', 'Add measurable impact.'],
    });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
});
