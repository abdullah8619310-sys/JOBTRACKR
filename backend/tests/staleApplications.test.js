const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const TODAY = new Date().toISOString().slice(0, 10);
const COMPANY = 'Stale Test Co';

function daysAgoUtcMidnight(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

// Creates a valid application (dateApplied = today, so it passes the
// existing create-time restriction), then backdates dateApplied directly
// via Prisma. This mirrors how the codebase already sets up "resume text
// missing" test fixtures — the API itself has no way to create a record
// with a past dateApplied, but a genuinely stale application is simply one
// that was created N days ago, which we simulate by backdating.
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

describe('GET /api/applications/stale', () => {
  afterAll(async () => {
    await prisma.jobApplication.deleteMany({ where: { company: COMPANY } });
    await prisma.$disconnect();
  });

  it('does not include this fixture\'s applications before any are created', async () => {
    const res = await request(app).get('/api/applications/stale');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((application) => application.company === COMPANY)).toBe(false);
  });

  it('does not treat an application exactly 7 days old as stale (boundary)', async () => {
    const id = await createApplicationAgedDays(7);

    const res = await request(app).get('/api/applications/stale');

    expect(res.status).toBe(200);
    expect(res.body.some((application) => application.id === id)).toBe(false);
  });

  it('treats an application older than 7 days as stale', async () => {
    const id = await createApplicationAgedDays(8);

    const res = await request(app).get('/api/applications/stale');

    expect(res.status).toBe(200);
    const match = res.body.find((application) => application.id === id);
    expect(match).toBeDefined();
    expect(match).toMatchObject({
      id,
      company: COMPANY,
      role: 'Backend Engineer',
      status: 'APPLIED',
      resumeVersion: 'v1',
    });
    // Only the fields the future Follow-up Agent needs — no large text fields.
    expect(match).not.toHaveProperty('resumeText');
    expect(match).not.toHaveProperty('jobDescription');
  });

  it('does not treat an application newer than 7 days as stale', async () => {
    const id = await createApplicationAgedDays(3);

    const res = await request(app).get('/api/applications/stale');

    expect(res.status).toBe(200);
    expect(res.body.some((application) => application.id === id)).toBe(false);
  });

  it('returns only the stale applications among a mix of stale and fresh ones', async () => {
    const staleId = await createApplicationAgedDays(10, { role: 'Stale Role' });
    const freshId = await createApplicationAgedDays(1, { role: 'Fresh Role' });

    const res = await request(app).get('/api/applications/stale');

    expect(res.status).toBe(200);
    expect(res.body.some((application) => application.id === staleId)).toBe(true);
    expect(res.body.some((application) => application.id === freshId)).toBe(false);
  });
});
