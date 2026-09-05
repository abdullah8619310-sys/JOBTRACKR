const { followUpOutputSchema } = require('../../validators/followUp.validator');
const AppError = require('../../utils/AppError');
const { withRetry } = require('../retry');

const FOLLOW_UP_TOOL = {
  name: 'submit_follow_up_email',
  description: 'Submit a structured follow-up email draft for a job application.',
  inputSchema: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'A short, professional email subject line referencing the role and/or company.',
      },
      body: {
        type: 'string',
        description:
          'The full email body text. Polite and brief, mentions the company and role, refers naturally to the earlier application, invents no facts not provided, and never claims an interview has occurred.',
      },
    },
    required: ['subject', 'body'],
  },
};

// The full drafting rules live in the system prompt (how to think), keeping
// the user prompt itself just the application data to draft from.
const SYSTEM_PROMPT = [
  'You are drafting a short, professional follow-up email on behalf of a job',
  'applicant who has not yet heard back about an application they submitted.',
  'The output is only a DRAFT for the applicant to review and edit themselves',
  '— it is never sent automatically — so it should read like a real, editable',
  'starting point, not a finished, presumptuous message.',
  '',
  'The email must:',
  '- Be polite, professional, and reasonably brief (a short email, not a',
  '  cover letter).',
  '- Mention the company name and the role applied for.',
  '- Refer naturally to the fact that the applicant previously applied and is',
  '  following up, without being pushy or demanding.',
  '- Sound like something a real applicant would plausibly write, not a',
  '  generic template dump.',
  '- Be easy for the applicant to lightly edit before sending (e.g. leave a',
  '  "[Your Name]" placeholder for the signature — never invent a real name).',
  '',
  'You are given ONLY: company, role, date applied, and resume version. You',
  'are NOT given, and must NEVER invent or assume, any of the following:',
  '- Whether an interview has been scheduled, offered, or discussed.',
  '- The name, title, or gender of any recruiter or hiring manager.',
  '- Any prior conversation, call, or correspondence with the company.',
  '- Specific achievements, projects, or resume content not provided to you.',
  '- Any other fact not explicitly given in the application data below.',
  '',
  'If a detail is missing or unclear, do not invent it — write around the gap',
  'in a natural, generic way instead (e.g. refer simply to "the position" if',
  'a detail is unclear, rather than fabricating specifics).',
  '',
  'Never state or imply that the applicant has already been interviewed or',
  'has received any update — this is a first follow-up on a pending',
  'application that has had no response yet.',
  '',
  'Always respond only by calling the provided tool with a subject and a body.',
].join('\n');

function formatDateApplied(dateApplied) {
  if (!dateApplied) return 'an unspecified date';
  const date = new Date(dateApplied);
  if (Number.isNaN(date.getTime())) return 'an unspecified date';
  return date.toISOString().slice(0, 10);
}

function buildPrompt({ company, role, dateApplied, resumeVersion }) {
  return [
    'Draft a follow-up email for this job application.',
    '',
    `Company: ${company}`,
    `Role: ${role}`,
    `Date applied: ${formatDateApplied(dateApplied)}`,
    `Resume version used: ${resumeVersion}`,
  ].join('\n');
}

// The `draft_followup` skill (Phase 2 "skills/tools" primitive). A
// single-shot, stateless call: no memory, no AgentRunner — just prompt in,
// validated structured JSON out. Never sends anything — the caller decides
// what to do with the draft.
async function followUp({ company, role, dateApplied, resumeVersion }, { modelClient }) {
  if (!modelClient) {
    throw new AppError('No model client configured for draft_followup', 500);
  }

  const rawOutput = await withRetry(() =>
    modelClient.generate({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt({ company, role, dateApplied, resumeVersion }),
      tool: FOLLOW_UP_TOOL,
    }),
  );

  const parsed = followUpOutputSchema.safeParse(rawOutput);

  if (!parsed.success) {
    throw new AppError(
      'Follow-up Agent returned malformed output',
      502,
      parsed.error.issues,
    );
  }

  return parsed.data;
}

module.exports = { followUp, FOLLOW_UP_TOOL, SYSTEM_PROMPT };
