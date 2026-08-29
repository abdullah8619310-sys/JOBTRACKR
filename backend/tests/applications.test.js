const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

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
      dateApplied: '2026-08-01',
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
