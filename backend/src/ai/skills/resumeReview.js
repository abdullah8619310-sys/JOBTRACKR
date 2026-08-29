const { resumeReviewOutputSchema } = require('../../validators/resumeReview.validator');
const AppError = require('../../utils/AppError');

const RESUME_REVIEW_TOOL = {
  name: 'submit_resume_review',
  description: 'Submit a structured resume-to-job-description fit review.',
  inputSchema: {
    type: 'object',
    properties: {
      matchScore: {
        type: 'number',
        description: 'Overall fit score from 0 to 100.',
      },
      missingKeywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Important keywords/skills from the job description missing from the resume.',
      },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
        description: '2-3 concrete, actionable suggestions to improve the resume for this job.',
      },
    },
    required: ['matchScore', 'missingKeywords', 'suggestions'],
  },
};

function buildPrompt({ resumeText, jobDescription }) {
  return [
    'Compare the following resume against the job description and call the',
    'submit_resume_review tool with your analysis. Be honest and specific.',
    '',
    '## Resume',
    resumeText,
    '',
    '## Job Description',
    jobDescription,
  ].join('\n');
}

// The `resume_review` skill (Phase 2 "skills/tools" primitive). A single-shot,
// stateless call: no memory, no AgentRunner — just prompt in, validated
// structured JSON out.
async function resumeReview({ resumeText, jobDescription }, { modelClient }) {
  if (!modelClient) {
    throw new AppError('No model client configured for resume_review', 500);
  }

  const rawOutput = await modelClient.generate({
    system:
      'You are a precise, honest technical resume reviewer. Always respond only by calling the provided tool.',
    prompt: buildPrompt({ resumeText, jobDescription }),
    tool: RESUME_REVIEW_TOOL,
  });

  const parsed = resumeReviewOutputSchema.safeParse(rawOutput);

  if (!parsed.success) {
    throw new AppError(
      'Resume Reviewer Agent returned malformed output',
      502,
      parsed.error.issues,
    );
  }

  return parsed.data;
}

module.exports = { resumeReview, RESUME_REVIEW_TOOL };
