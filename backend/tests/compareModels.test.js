// Week 7, Phase 11 — Live Multi-Model Comparison. Same technique as the
// other endpoint tests: GroqModelClient/OpenRouterModelClient are replaced
// on the shared, cached `ai` module object (a plain Node module-cache
// technique, not vi.mock, which does not reliably intercept this project's
// CommonJS require() chain) so no real network call is ever made.
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const ai = require('../src/ai');
const env = require('../src/config/env');

const mockGroqGenerate = vi.fn();
const mockOpenRouterGenerate = vi.fn();
const RealGroqModelClient = ai.GroqModelClient;
const RealOpenRouterModelClient = ai.OpenRouterModelClient;

class MockGroqModelClient {
  constructor() {
    this.model = 'mock-groq-model';
    this.generate = mockGroqGenerate;
  }
}

class MockOpenRouterModelClient {
  constructor() {
    this.model = 'mock-openrouter-model';
    this.generate = mockOpenRouterGenerate;
  }
}

ai.GroqModelClient = vi.fn().mockImplementation(MockGroqModelClient);
ai.OpenRouterModelClient = vi.fn().mockImplementation(MockOpenRouterModelClient);

const COMPANY = 'Compare Models Test Co';
const VALID_RESULT = {
  matchScore: 80,
  missingKeywords: ['Docker'],
  suggestions: ['Add a project demonstrating containerization.', 'Highlight any CI/CD experience.'],
};

async function createApplication(overrides = {}) {
  const res = await request(app)
    .post('/api/applications')
    .send({
      company: COMPANY,
      role: 'Backend Engineer',
      dateApplied: new Date().toISOString().slice(0, 10),
      resumeVersion: 'v1',
      resumeText: 'Node.js, Express, PostgreSQL.',
      jobDescription: 'Looking for a backend engineer with Node.js and Docker experience.',
      ...overrides,
    });
  return res.body.id;
}

describe('POST /api/applications/:id/compare-models', () => {
  const originalGroqKey = env.GROQ_API_KEY;
  const originalOpenRouterKey = env.OPENROUTER_API_KEY;

  beforeEach(() => {
    mockGroqGenerate.mockReset();
    mockOpenRouterGenerate.mockReset();
    env.GROQ_API_KEY = originalGroqKey;
    env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  afterAll(async () => {
    ai.GroqModelClient = RealGroqModelClient;
    ai.OpenRouterModelClient = RealOpenRouterModelClient;
    env.GROQ_API_KEY = originalGroqKey;
    env.OPENROUTER_API_KEY = originalOpenRouterKey;
    await prisma.jobApplication.deleteMany({ where: { company: COMPANY } });
    await prisma.$disconnect();
  });

  it('returns 404 when the application does not exist', async () => {
    const res = await request(app).post('/api/applications/does-not-exist/compare-models');

    expect(res.status).toBe(404);
    expect(mockGroqGenerate).not.toHaveBeenCalled();
    expect(mockOpenRouterGenerate).not.toHaveBeenCalled();
  });

  it('returns 422 when the application has no resume text', async () => {
    const id = await createApplication();
    await prisma.jobApplication.update({ where: { id }, data: { resumeText: null } });

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(422);
    expect(mockGroqGenerate).not.toHaveBeenCalled();
    expect(mockOpenRouterGenerate).not.toHaveBeenCalled();
  });

  it('returns 503 when neither provider is configured', async () => {
    delete env.GROQ_API_KEY;
    delete env.OPENROUTER_API_KEY;
    const id = await createApplication();

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/GROQ_API_KEY.*OPENROUTER_API_KEY/);
    expect(mockGroqGenerate).not.toHaveBeenCalled();
    expect(mockOpenRouterGenerate).not.toHaveBeenCalled();
  });

  it('sends the identical resume_review task to both providers and returns both labeled, validated results', async () => {
    const id = await createApplication();
    mockGroqGenerate.mockResolvedValue(VALID_RESULT);
    mockOpenRouterGenerate.mockResolvedValue({ ...VALID_RESULT, matchScore: 65 });

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(200);
    expect(res.body.applicationId).toBe(id);
    expect(res.body.results).toHaveLength(2);

    const groqEntry = res.body.results.find((r) => r.provider === 'groq');
    const openrouterEntry = res.body.results.find((r) => r.provider === 'openrouter');

    expect(groqEntry).toMatchObject({ provider: 'groq', model: 'mock-groq-model', status: 'success', result: VALID_RESULT });
    expect(openrouterEntry).toMatchObject({ provider: 'openrouter', model: 'mock-openrouter-model', status: 'success' });
    expect(openrouterEntry.result.matchScore).toBe(65);

    // Same logical task sent to both — identical prompt/tool, not two
    // different questions.
    expect(mockGroqGenerate).toHaveBeenCalledTimes(1);
    expect(mockOpenRouterGenerate).toHaveBeenCalledTimes(1);
    const groqCallArgs = mockGroqGenerate.mock.calls[0][0];
    const openrouterCallArgs = mockOpenRouterGenerate.mock.calls[0][0];
    expect(groqCallArgs.prompt).toBe(openrouterCallArgs.prompt);
    expect(groqCallArgs.tool.name).toBe('submit_resume_review');
    expect(openrouterCallArgs.tool.name).toBe('submit_resume_review');
  });

  it('represents one provider failure as a labeled error entry, without fabricating data or blocking the other provider', async () => {
    const id = await createApplication();
    mockGroqGenerate.mockRejectedValue(new Error('groq is down'));
    mockOpenRouterGenerate.mockResolvedValue(VALID_RESULT);

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(200);
    const groqEntry = res.body.results.find((r) => r.provider === 'groq');
    const openrouterEntry = res.body.results.find((r) => r.provider === 'openrouter');

    expect(groqEntry.status).toBe('error');
    expect(groqEntry.error).toMatch(/groq is down/);
    expect(groqEntry).not.toHaveProperty('result');
    expect(openrouterEntry.status).toBe('success');
    expect(openrouterEntry.result).toEqual(VALID_RESULT);
  });

  it('returns 502 when every configured provider fails', async () => {
    const id = await createApplication();
    mockGroqGenerate.mockRejectedValue(new Error('groq is down'));
    mockOpenRouterGenerate.mockRejectedValue(new Error('openrouter is down'));

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(502);
    expect(res.body.results.every((r) => r.status === 'error')).toBe(true);
  });

  it('labels an unconfigured provider as a config error without affecting the configured one', async () => {
    delete env.OPENROUTER_API_KEY;
    const id = await createApplication();
    mockGroqGenerate.mockResolvedValue(VALID_RESULT);

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(200);
    const openrouterEntry = res.body.results.find((r) => r.provider === 'openrouter');
    expect(openrouterEntry.status).toBe('error');
    expect(openrouterEntry.model).toBeNull();
    expect(openrouterEntry.error).toMatch(/OPENROUTER_API_KEY/);
    expect(mockOpenRouterGenerate).not.toHaveBeenCalled();

    const groqEntry = res.body.results.find((r) => r.provider === 'groq');
    expect(groqEntry.status).toBe('success');
  });

  it('rejects malformed output from one provider as a validation error, not fake data', async () => {
    const id = await createApplication();
    mockGroqGenerate.mockResolvedValue({ matchScore: 999, missingKeywords: [], suggestions: ['only one'] });
    mockOpenRouterGenerate.mockResolvedValue(VALID_RESULT);

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(200);
    const groqEntry = res.body.results.find((r) => r.provider === 'groq');
    expect(groqEntry.status).toBe('error');
    expect(groqEntry.error).toMatch(/malformed output/i);
    expect(groqEntry).not.toHaveProperty('result');
  });

  it('still retries a transient failure per provider before succeeding (existing retry behavior intact)', async () => {
    const id = await createApplication();
    const transientError = new Error('temporarily unavailable');
    transientError.status = 500;
    mockGroqGenerate.mockRejectedValueOnce(transientError).mockResolvedValueOnce(VALID_RESULT);
    mockOpenRouterGenerate.mockResolvedValue(VALID_RESULT);

    const res = await request(app).post(`/api/applications/${id}/compare-models`);

    expect(res.status).toBe(200);
    expect(mockGroqGenerate).toHaveBeenCalledTimes(2);
    const groqEntry = res.body.results.find((r) => r.provider === 'groq');
    expect(groqEntry.status).toBe('success');
    expect(groqEntry.result).toEqual(VALID_RESULT);
  });
});
