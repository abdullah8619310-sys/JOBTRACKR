const { resumeReview } = require('../src/ai/skills/resumeReview');

const VALID_INPUT = {
  resumeText: 'Backend engineer experienced with Node.js and PostgreSQL.',
  jobDescription: 'Looking for a backend engineer with Node.js and Kubernetes experience.',
};

describe('resumeReview skill', () => {
  it('returns validated structured output when the model responds correctly', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({
        matchScore: 72,
        missingKeywords: ['Kubernetes'],
        suggestions: ['Mention any container orchestration experience.', 'Quantify past impact.'],
      }),
    };

    const result = await resumeReview(VALID_INPUT, { modelClient });

    expect(modelClient.generate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      matchScore: 72,
      missingKeywords: ['Kubernetes'],
      suggestions: ['Mention any container orchestration experience.', 'Quantify past impact.'],
    });
  });

  it('passes resumeText and jobDescription into the prompt sent to the model', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({
        matchScore: 50,
        missingKeywords: [],
        suggestions: ['A.', 'B.'],
      }),
    };

    await resumeReview(VALID_INPUT, { modelClient });

    const callArgs = modelClient.generate.mock.calls[0][0];
    expect(callArgs.prompt).toContain(VALID_INPUT.resumeText);
    expect(callArgs.prompt).toContain(VALID_INPUT.jobDescription);
    expect(callArgs.tool.name).toBe('submit_resume_review');
  });

  it('throws a clear error when no modelClient is provided', async () => {
    await expect(resumeReview(VALID_INPUT, {})).rejects.toThrow(
      'No model client configured for resume_review',
    );
  });

  it('rejects malformed output missing required fields', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({ matchScore: 50 }),
    };

    await expect(resumeReview(VALID_INPUT, { modelClient })).rejects.toThrow(
      'Resume Reviewer Agent returned malformed output',
    );
  });

  it('rejects output with a match score out of range', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({
        matchScore: 150,
        missingKeywords: [],
        suggestions: ['A.', 'B.'],
      }),
    };

    await expect(resumeReview(VALID_INPUT, { modelClient })).rejects.toThrow(
      'Resume Reviewer Agent returned malformed output',
    );
  });

  it('rejects output with too few suggestions', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({
        matchScore: 50,
        missingKeywords: [],
        suggestions: ['Only one suggestion.'],
      }),
    };

    await expect(resumeReview(VALID_INPUT, { modelClient })).rejects.toThrow(
      'Resume Reviewer Agent returned malformed output',
    );
  });

  it('propagates a model/API failure without swallowing it', async () => {
    const modelClient = {
      generate: vi.fn().mockRejectedValue(new Error('upstream API error')),
    };

    await expect(resumeReview(VALID_INPUT, { modelClient })).rejects.toThrow(
      'upstream API error',
    );
  });
});
