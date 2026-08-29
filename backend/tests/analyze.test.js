process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const ai = require('../src/ai');

// The controller does `new ai.AnthropicModelClient(...)` via a live property
// lookup on this exact cached module object, so replacing the property here
// swaps it out everywhere without any real network call ever happening.
const mockGenerate = vi.fn();
const RealAnthropicModelClient = ai.AnthropicModelClient;

class MockAnthropicModelClient {
  constructor() {
    this.generate = mockGenerate;
  }
}

ai.AnthropicModelClient = vi.fn().mockImplementation(MockAnthropicModelClient);

async function createTestApplication(overrides = {}) {
  const res = await request(app)
    .post('/api/applications')
    .send({
      company: 'Analyze Test Co',
      role: 'Backend Engineer',
      dateApplied: '2026-08-01',
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
    ai.AnthropicModelClient = RealAnthropicModelClient;
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
