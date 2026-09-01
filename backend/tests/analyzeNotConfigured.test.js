const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const env = require('../src/config/env');

describe('POST /api/applications/:id/analyze (no GROQ_API_KEY configured)', () => {
  const realGroqApiKey = env.GROQ_API_KEY;

  beforeAll(() => {
    // Mutate the already-parsed, shared `env` object directly rather than
    // process.env. Deleting process.env.GROQ_API_KEY before requiring the
    // app is NOT reliable: dotenv.config() (triggered when config/env.js
    // loads) repopulates any *absent* process.env var straight from a real
    // .env file, silently undoing the delete whenever a real key is present
    // on the machine running the tests — which would let a real network
    // call slip through. Mutating the cached, already-parsed `env` export
    // (the same object the controller reads via a live `env.GROQ_API_KEY`
    // property lookup) sidesteps dotenv entirely and works regardless of
    // what's actually in .env.
    delete env.GROQ_API_KEY;
  });

  afterAll(async () => {
    env.GROQ_API_KEY = realGroqApiKey;
    await prisma.jobApplication.deleteMany({ where: { company: 'Analyze Not Configured Co' } });
    await prisma.$disconnect();
  });

  it('returns 503 without attempting any model call', async () => {
    const createRes = await request(app).post('/api/applications').send({
      company: 'Analyze Not Configured Co',
      role: 'Backend Engineer',
      dateApplied: new Date().toISOString().slice(0, 10),
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    const res = await request(app).post(`/api/applications/${createRes.body.id}/analyze`);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/GROQ_API_KEY/);
  });
});
