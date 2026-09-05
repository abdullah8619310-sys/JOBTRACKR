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

  it('sends a job-fit scoring rubric and matching rules in the system prompt', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({
        matchScore: 50,
        missingKeywords: [],
        suggestions: ['A.', 'B.'],
      }),
    };

    await resumeReview(VALID_INPUT, { modelClient });

    const callArgs = modelClient.generate.mock.calls[0][0];

    // The scoring rubric bands must be present, not left to an arbitrary guess.
    expect(callArgs.system).toContain('90-100');
    expect(callArgs.system).toContain('0-19');

    // The core anti-hallucination / anti-generic-advice rules must be present.
    expect(callArgs.system).toMatch(/never list a matched skill as missing/i);
    expect(callArgs.system).toMatch(/never suggest the candidate .learn/i);
    expect(callArgs.system).toMatch(/return an empty\s+array/i);
    expect(callArgs.system).toMatch(/job-fit evaluator, not a resume-quality reviewer/i);
  });

  it('does not ask the model to evaluate resume-writing quality', async () => {
    const modelClient = {
      generate: vi.fn().mockResolvedValue({
        matchScore: 50,
        missingKeywords: [],
        suggestions: ['A.', 'B.'],
      }),
    };

    await resumeReview(VALID_INPUT, { modelClient });

    const callArgs = modelClient.generate.mock.calls[0][0];
    expect(callArgs.system).toMatch(/do not confuse resume-writing quality with job fit/i);
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
