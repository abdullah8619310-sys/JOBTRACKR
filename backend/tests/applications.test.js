const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

// dateApplied can never be before a record's own creation date, so tests
// must use "today", not a fixed past date that will eventually go stale.
const TODAY = new Date().toISOString().slice(0, 10);

describe('Job Applications API', () => {
  let createdId;

  it('rejects an invalid payload on create', async () => {
    const res = await request(app).post('/api/applications').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('creates a job application', async () => {
    const payload = {
      company: 'Acme Corp',
      role: 'Backend Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v1-backend',
      resumeText: 'Experienced backend engineer skilled in Node.js and PostgreSQL.',
      jobDescription: 'Build and maintain backend services.',
    };

    const res = await request(app).post('/api/applications').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      company: payload.company,
      role: payload.role,
      status: 'APPLIED',
      resumeVersion: payload.resumeVersion,
      resumeText: payload.resumeText,
      jobDescription: payload.jobDescription,
    });
    expect(typeof res.body.id).toBe('string');

    createdId = res.body.id;
  });

  it('lists job applications including the created one', async () => {
    const res = await request(app).get('/api/applications');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((application) => application.id === createdId)).toBe(true);
  });

  it('gets a single job application by id', async () => {
    const res = await request(app).get(`/api/applications/${createdId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).get('/api/applications/does-not-exist');

    expect(res.status).toBe(404);
  });

  it('updates a job application', async () => {
    const res = await request(app)
      .put(`/api/applications/${createdId}`)
      .send({ status: 'INTERVIEWING' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('INTERVIEWING');
  });

  it('rejects an update with no fields', async () => {
    const res = await request(app).put(`/api/applications/${createdId}`).send({});

    expect(res.status).toBe(400);
  });

  it('deletes a job application', async () => {
    const res = await request(app).delete(`/api/applications/${createdId}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when fetching a deleted application', async () => {
    const res = await request(app).get(`/api/applications/${createdId}`);

    expect(res.status).toBe(404);
  });

  afterAll(async () => {
    await prisma.jobApplication.deleteMany({ where: { company: 'Acme Corp' } });
    await prisma.$disconnect();
  });
});

describe('dateApplied cannot be before a record\'s own creation date', () => {
  function yesterday() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  afterAll(async () => {
    await prisma.jobApplication.deleteMany({ where: { company: 'Date Restriction Co' } });
    await prisma.$disconnect();
  });

  it('rejects creating an application with dateApplied before today', async () => {
    const res = await request(app).post('/api/applications').send({
      company: 'Date Restriction Co',
      role: 'Backend Engineer',
      dateApplied: yesterday(),
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    expect(res.status).toBe(400);
    expect(res.body.details?.[0]?.path).toBe('dateApplied');
  });

  it('accepts creating an application with dateApplied set to today', async () => {
    const res = await request(app).post('/api/applications').send({
      company: 'Date Restriction Co',
      role: 'Backend Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    expect(res.status).toBe(201);
  });

  it('rejects updating dateApplied to a date before the record was created', async () => {
    const createRes = await request(app).post('/api/applications').send({
      company: 'Date Restriction Co',
      role: 'Backend Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    const res = await request(app)
      .put(`/api/applications/${createRes.body.id}`)
      .send({ dateApplied: yesterday() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/dateApplied/i);
  });

  it('accepts updating dateApplied to today (on/after the record\'s creation date)', async () => {
    const createRes = await request(app).post('/api/applications').send({
      company: 'Date Restriction Co',
      role: 'Backend Engineer',
      dateApplied: TODAY,
      resumeVersion: 'v1',
      resumeText: 'Some resume text.',
      jobDescription: 'Some job description.',
    });

    const res = await request(app)
      .put(`/api/applications/${createRes.body.id}`)
      .send({ dateApplied: TODAY });

    expect(res.status).toBe(200);
  });
});
