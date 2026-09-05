const { followUp } = require('../src/ai/skills/followUp');

const VALID_INPUT = {
  company: 'Acme Technologies',
  role: 'Backend Engineer',
  dateApplied: '2026-08-10',
  resumeVersion: 'v2',
};

const VALID_MODEL_RESPONSE = {
  subject: 'Follow-up on Backend Engineer Application',
  body:
    "Dear Hiring Team,\n\nI'm following up regarding my application for the Backend Engineer " +
    'position at Acme Technologies. I remain very interested in the opportunity and would ' +
    'appreciate any update you can share regarding the status of my application.\n\n' +
    'Thank you for your time and consideration.\n\nBest regards,\n[Your Name]',
};

describe('followUp skill', () => {
  it('returns the validated structured object on a valid generation', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue(VALID_MODEL_RESPONSE),
    };

    const result = await followUp(VALID_INPUT, { modelClient });

    expect(modelClient.generate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(VALID_MODEL_RESPONSE);
  });

  it('rejects malformed output missing the body field', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({ subject: 'Follow-up' }),
    };

    await expect(followUp(VALID_INPUT, { modelClient })).rejects.toThrow(
      'Follow-up Agent returned malformed output',
    );
  });

  it('rejects empty subject/body strings', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({ subject: '', body: '   ' }),
    };

    await expect(followUp(VALID_INPUT, { modelClient })).rejects.toThrow(
      'Follow-up Agent returned malformed output',
    );
  });

  it('propagates a model/API failure without swallowing it', async () => {
    const modelClient = {
      generate: vi.fn().mockRejectedValue(new Error('upstream API error')),
    };

    await expect(followUp(VALID_INPUT, { modelClient })).rejects.toThrow('upstream API error');
  });

  it('throws a clear error when no modelClient is provided', async () => {
    await expect(followUp(VALID_INPUT, {})).rejects.toThrow(
      'No model client configured for draft_followup',
    );
  });

  it('grounds the prompt in the supplied company, role, date applied, and resume version', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue(VALID_MODEL_RESPONSE),
    };

    await followUp(VALID_INPUT, { modelClient });

    const callArgs = modelClient.generate.mock.calls[0][0];
    expect(callArgs.prompt).toContain(VALID_INPUT.company);
    expect(callArgs.prompt).toContain(VALID_INPUT.role);
    expect(callArgs.prompt).toContain(VALID_INPUT.dateApplied);
    expect(callArgs.prompt).toContain(VALID_INPUT.resumeVersion);
    expect(callArgs.tool.name).toBe('submit_follow_up_email');
  });

  it('instructs the model not to invent facts not provided', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue(VALID_MODEL_RESPONSE),
    };

    await followUp(VALID_INPUT, { modelClient });

    const callArgs = modelClient.generate.mock.calls[0][0];
    expect(callArgs.system).toMatch(/must never invent or assume/i);
    expect(callArgs.system).toMatch(/interview has been scheduled, offered, or discussed/i);
    expect(callArgs.system).toMatch(/never state or imply that the applicant has already been interviewed/i);
  });
});
