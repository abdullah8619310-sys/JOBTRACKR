const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const env = require('../src/config/env');

describe('POST /api/applications/:id/follow-up (no GROQ_API_KEY configured)', () => {
  const realGroqApiKey = env.GROQ_API_KEY;

  beforeAll(() => {
    // Same technique as analyzeNotConfigured.test.js: mutate the shared,
    // already-parsed `env` export directly rather than process.env, since
    // dotenv would just repopulate a deleted process.env var from a real
    // .env file on this machine.
    delete env.GROQ_API_KEY;
  });

  afterAll(async () => {
    env.GROQ_API_KEY = realGroqApiKey;
    await prisma.jobApplication.deleteMany({ where: { company: 'FollowUp Not Configured Co' } });
    await prisma.$disconnect();
  });

  it('returns 503 without attempting any model call', async () => {
    const createRes = await request(app).post('/api/applications').send({
      company: 'FollowUp Not Configured Co',
      role: 'Backend Engineer',
      dateApplied: new Date().toISOString().slice(0, 10),
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    const id = createRes.body.id;

    // Must be stale, otherwise the "not stale" 422 check fires first and
    // this test wouldn't actually exercise the missing-API-key branch.
    const tenDaysAgo = new Date();
    tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 10);
    await prisma.jobApplication.update({ where: { id }, data: { dateApplied: tenDaysAgo } });

    const res = await request(app).post(`/api/applications/${id}/follow-up`);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/GROQ_API_KEY/);
  });
});
