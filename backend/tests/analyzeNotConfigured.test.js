delete process.env.ANTHROPIC_API_KEY;

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

describe('POST /api/applications/:id/analyze (no ANTHROPIC_API_KEY configured)', () => {
  afterAll(async () => {
    await prisma.jobApplication.deleteMany({ where: { company: 'Analyze Not Configured Co' } });
    await prisma.$disconnect();
  });

  it('returns 503 without attempting any model call', async () => {
    const createRes = await request(app).post('/api/applications').send({
      company: 'Analyze Not Configured Co',
      role: 'Backend Engineer',
      dateApplied: '2026-08-01',
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    const res = await request(app).post(`/api/applications/${createRes.body.id}/analyze`);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/ANTHROPIC_API_KEY/);
  });
});
