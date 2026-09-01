const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const {
  createApplicationSchema,
  updateApplicationSchema,
  idParamSchema,
  toUtcDateOnly,
} = require('../validators/applications.validator');
// Accessed as a namespace object (not destructured) so tests can safely
// replace `ai.GroqModelClient` on the shared, cached module object
// without needing a bundler-level module-mocking mechanism.
const ai = require('../ai');

async function createApplication(req, res) {
  const data = createApplicationSchema.parse(req.body);
  const application = await prisma.jobApplication.create({ data });
  res.status(201).json(application);
}

async function listApplications(req, res) {
  const applications = await prisma.jobApplication.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json(applications);
}

async function getApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application) {
    throw new AppError('Job application not found', 404);
  }

  res.status(200).json(application);
}

async function updateApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateApplicationSchema.parse(req.body);

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Job application not found', 404);
  }

  if (data.dateApplied && toUtcDateOnly(data.dateApplied) < toUtcDateOnly(existing.createdAt)) {
    throw new AppError(
      'dateApplied cannot be before this record was created — a job cannot have been applied to before this application record existed',
      400,
    );
  }

  const application = await prisma.jobApplication.update({ where: { id }, data });
  res.status(200).json(application);
}

async function deleteApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const existing = await prisma.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Job application not found', 404);
  }

  await prisma.jobApplication.delete({ where: { id } });
  res.status(204).send();
}

async function analyzeApplication(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application) {
    throw new AppError('Job application not found', 404);
  }

  if (!application.resumeText || application.resumeText.trim() === '') {
    throw new AppError(
      'This application has no resume text saved yet. Add resume text before running Analyze Fit.',
      422,
    );
  }

  if (!env.GROQ_API_KEY) {
    throw new AppError(
      'AI provider is not configured on this server (missing GROQ_API_KEY)',
      503,
    );
  }

  const resumeReviewSkill = ai.toolRegistry.get('resume_review');
  if (!resumeReviewSkill) {
    throw new AppError('resume_review skill is not registered', 500);
  }

  const modelClient = new ai.GroqModelClient({ apiKey: env.GROQ_API_KEY });
  const runResumeReview = ai.withLogging('resume_review', resumeReviewSkill);

  let result;
  try {
    result = await runResumeReview(
      { resumeText: application.resumeText, jobDescription: application.jobDescription },
      { modelClient },
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Resume Reviewer Agent call failed: ${error.message}`, 502);
  }

  res.status(200).json(result);
}

module.exports = {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  analyzeApplication,
};
