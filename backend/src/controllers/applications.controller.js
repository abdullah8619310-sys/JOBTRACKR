const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { findStaleApplications, isApplicationStale } = require('../services/applications.service');
const {
  createApplicationSchema,
  updateApplicationSchema,
  idParamSchema,
} = require('../validators/applications.validator');
// Accessed as a namespace object (not destructured) so tests can safely
// replace e.g. `ai.GroqModelClient` on the shared, cached module object
// without needing a bundler-level module-mocking mechanism. The controller
// itself never names a specific provider — it only calls
// `ai.createModelClient()`, which does the provider routing internally.
const ai = require('../ai');
const env = require('../config/env');

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

// Backend foundation for the future Follow-up Agent (Week 7, Phase 1): no
// LLM call here, just identifying stale applications and returning the
// structured data a later phase's agent will consume.
async function listStaleApplications(req, res) {
  const applications = await findStaleApplications();
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

  const resumeReviewSkill = ai.toolRegistry.get('resume_review');
  if (!resumeReviewSkill) {
    throw new AppError('resume_review skill is not registered', 500);
  }

  const modelClient = ai.createModelClient();
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

// Week 7, Phase 3: generates a follow-up email draft for one stale
// application. Mirrors analyzeApplication's exact pattern (skill lookup →
// hook → modelClient), just against the draft_followup skill instead of
// resume_review. Never persists anything and never sends anything.
async function generateFollowUp(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application) {
    throw new AppError('Job application not found', 404);
  }

  if (!isApplicationStale(application.dateApplied)) {
    throw new AppError(
      'A follow-up draft is only available for stale applications (dateApplied more than 7 days ago).',
      422,
    );
  }

  const followUpSkill = ai.toolRegistry.get('draft_followup');
  if (!followUpSkill) {
    throw new AppError('draft_followup skill is not registered', 500);
  }

  const modelClient = ai.createModelClient();
  const runFollowUp = ai.withLogging('draft_followup', followUpSkill);

  let result;
  try {
    result = await runFollowUp(
      {
        company: application.company,
        role: application.role,
        dateApplied: application.dateApplied,
        resumeVersion: application.resumeVersion,
      },
      { modelClient },
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Follow-up Agent call failed: ${error.message}`, 502);
  }

  res.status(200).json(result);
}

// Week 7, Phase 11: fixed set of the two providers this app supports. Not
// AI_PROVIDER-driven — comparison deliberately needs BOTH clients regardless
// of which single provider AI_PROVIDER currently selects.
const COMPARISON_PROVIDERS = [
  { name: 'groq', apiKeyEnvVar: 'GROQ_API_KEY', clientKey: 'GroqModelClient' },
  { name: 'openrouter', apiKeyEnvVar: 'OPENROUTER_API_KEY', clientKey: 'OpenRouterModelClient' },
];

// Week 7, Phase 11 — Live Multi-Model Comparison: sends the exact same
// resume_review task to every configured provider independently and
// returns both results side by side, each labeled by provider/model. This
// is comparison, not routing: `ai.createModelClient()`/`AI_PROVIDER`
// (single-provider selection used by analyzeApplication/generateFollowUp)
// is completely untouched — this endpoint deliberately bypasses it and
// constructs both concrete clients directly via `ai.GroqModelClient`/
// `ai.OpenRouterModelClient` (already exported for exactly this kind of
// direct construction). No automatic fallback: a provider that fails or
// isn't configured becomes its own labeled error entry in the response,
// never silently replaced by the other provider's result. The
// resume_review skill itself is reused unchanged, so each attempt still
// gets the existing retry-on-transient-failure and Zod validation. Nothing
// is persisted to the database.
async function compareModels(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application) {
    throw new AppError('Job application not found', 404);
  }

  if (!application.resumeText || application.resumeText.trim() === '') {
    throw new AppError(
      'This application has no resume text saved yet. Add resume text before comparing models.',
      422,
    );
  }

  const anyProviderConfigured = COMPARISON_PROVIDERS.some((p) => env[p.apiKeyEnvVar]);
  if (!anyProviderConfigured) {
    throw new AppError(
      'No AI provider is configured on this server for comparison (missing both GROQ_API_KEY and OPENROUTER_API_KEY)',
      503,
    );
  }

  const resumeReviewSkill = ai.toolRegistry.get('resume_review');
  if (!resumeReviewSkill) {
    throw new AppError('resume_review skill is not registered', 500);
  }
  const runResumeReview = ai.withLogging('resume_review', resumeReviewSkill);

  const input = { resumeText: application.resumeText, jobDescription: application.jobDescription };

  const results = await Promise.all(
    COMPARISON_PROVIDERS.map(async (p) => {
      if (!env[p.apiKeyEnvVar]) {
        return {
          provider: p.name,
          model: null,
          status: 'error',
          error: `AI provider is not configured on this server (missing ${p.apiKeyEnvVar})`,
        };
      }

      let modelClient;
      try {
        modelClient = new ai[p.clientKey]({ apiKey: env[p.apiKeyEnvVar] });
      } catch (error) {
        return { provider: p.name, model: null, status: 'error', error: error.message };
      }

      try {
        const result = await runResumeReview(input, { modelClient });
        return { provider: p.name, model: modelClient.model, status: 'success', result };
      } catch (error) {
        const entry = { provider: p.name, model: modelClient.model, status: 'error', error: error.message };
        if (error.details) entry.details = error.details;
        return entry;
      }
    }),
  );

  const successCount = results.filter((r) => r.status === 'success').length;
  // 200 as long as at least one provider produced a real result — a partial
  // comparison (one success, one config/call error) is still a useful,
  // honest response. Only when every attempted provider genuinely failed
  // does this mirror analyzeApplication's 502 (an upstream AI failure).
  res.status(successCount > 0 ? 200 : 502).json({ applicationId: id, results });
}

module.exports = {
  createApplication,
  listApplications,
  listStaleApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  analyzeApplication,
  generateFollowUp,
  compareModels,
};
