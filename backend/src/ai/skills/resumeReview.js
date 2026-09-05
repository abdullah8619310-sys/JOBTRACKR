const { resumeReviewOutputSchema } = require('../../validators/resumeReview.validator');
const AppError = require('../../utils/AppError');
const { withRetry } = require('../retry');

const RESUME_REVIEW_TOOL = {
  name: 'submit_resume_review',
  description: 'Submit a structured resume-to-job-description fit review.',
  inputSchema: {
    type: 'object',
    properties: {
      matchScore: {
        type: 'number',
        description:
          'Overall job-fit score from 0 to 100, based strictly on the scoring rubric in the system instructions — the proportion of important job requirements actually matched in the resume, never an arbitrary guess.',
      },
      missingKeywords: {
        type: 'array',
        items: { type: 'string' },
        description:
          'ONLY required or preferred skills/technologies/qualifications from the job description that are genuinely absent from the resume. Never include a skill that is present in the resume in any form. Return an empty array if nothing meaningful is missing — never invent entries.',
      },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
        description:
          '2-3 suggestions directly tied to closing gaps between the resume and this job description. Never suggest learning, gaining, or adding a skill that is already present in the resume. Not generic resume-writing advice.',
      },
    },
    required: ['matchScore', 'missingKeywords', 'suggestions'],
  },
};

// The full evaluation methodology lives in the system prompt (how to think),
// keeping the user prompt itself just the data to evaluate.
const SYSTEM_PROMPT = [
  'You are a job-fit evaluator, not a resume-quality reviewer. Your ONLY task',
  'is to judge how well a resume matches a specific job description\'s actual',
  'requirements — not how well-written, detailed, or polished the resume is.',
  'The question is "how well does this resume match this job description",',
  'never "how professionally written is this resume".',
  '',
  'What to evaluate, in priority order:',
  '1. Required skills and technologies explicitly stated in the job description.',
  '2. Preferred/nice-to-have skills and technologies in the job description.',
  '3. Relevant experience and responsibilities that align with the role.',
  '4. Education/certifications, only if the job description treats them as a requirement.',
  '5. Any other explicitly stated qualifications.',
  '',
  'Matching rules:',
  '- Treat a skill/technology as PRESENT if it appears in any reasonable form',
  '  (e.g. "React.js", "ReactJS", and "React" are the same skill; "JS" and',
  '  "JavaScript" are the same skill). Do not require exact wording.',
  '- If a required or preferred skill from the job description is clearly',
  '  present in the resume, it is MATCHED. Never list a matched skill as missing,',
  '  and never suggest the candidate learn, gain, or add it.',
  '- Only put a skill/technology/qualification in missingKeywords if it is',
  '  actually required or preferred by the job description AND is genuinely',
  '  absent from the resume. If nothing meaningful is missing, return an empty',
  '  array — never invent missing items to fill space.',
  '',
  'Scoring — use this rubric, do not pick an arbitrary number. Base the score',
  'on the proportion of important job requirements (required skills first,',
  'then preferred skills, then relevant experience) that are actually matched:',
  '- 90-100 = Excellent match. Nearly all important requirements present.',
  '- 75-89  = Strong match. Most important requirements present, minor gaps only.',
  '- 60-74  = Good/moderate match. Several important requirements match, but',
  '           some meaningful gaps exist.',
  '- 40-59  = Partial match. Some relevant requirements match, but important',
  '           requirements are missing.',
  '- 20-39  = Weak match. Very few important requirements match.',
  '- 0-19   = Very poor match. Almost none of the important requirements match.',
  '',
  'Concretely: if the resume contains all or nearly all of the important',
  'required skills from the job description, score approximately 85-100 —',
  'even if the resume is short or lacks detail — unless the job description',
  'itself explicitly requires things (e.g. years of experience, specific',
  'measurable achievements) that are genuinely absent. If the resume contains',
  'none of the important required skills, score approximately 0-20, unless',
  'other explicitly stated requirements are genuinely met.',
  '',
  'What NOT to do:',
  '- Do not penalize the resume for lacking years of experience, measurable',
  '  achievements, grammar quality, project detail, or formatting, UNLESS the',
  '  job description explicitly asks for these things.',
  '- Do not confuse resume-writing quality with job fit.',
  '- Never suggest the candidate "learn", "gain experience in", or "add" a',
  '  skill that is already clearly present in the resume.',
  '- Suggestions must be directly tied to genuine gaps between the resume and',
  '  the job description. When there are no meaningful gaps, suggestions may',
  '  instead recommend strengthening evidence for already-matched skills (e.g.',
  '  "add a project demonstrating your React experience") — never generic',
  '  resume-writing advice unrelated to this specific job.',
  '',
  'Always respond only by calling the provided tool with your analysis.',
].join('\n');

function buildPrompt({ resumeText, jobDescription }) {
  return [
    'Evaluate this resume against this job description.',
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

  const rawOutput = await withRetry(() =>
    modelClient.generate({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt({ resumeText, jobDescription }),
      tool: RESUME_REVIEW_TOOL,
    }),
  );

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

module.exports = { resumeReview, RESUME_REVIEW_TOOL, SYSTEM_PROMPT };
