// Proves retry works through BOTH real concrete ModelClient implementations
// (not just a generic fake), using the real SDK error classes — no real
// network call happens: only the SDKs' own internal `chat.completions.create`
// is mocked, exactly like groqModelClient.test.js/openRouterModelClient.test.js
// already do. This is what distinguishes these from retry.test.js's plain
// unit tests: it confirms the retry wrapper inside the skill actually
// engages correctly when driven by each real provider client.
const Groq = require('groq-sdk');
const OpenAI = require('openai');
const { resumeReview } = require('../src/ai/skills/resumeReview');
const { GroqModelClient } = require('../src/ai/clients/groqModelClient');
const { OpenRouterModelClient } = require('../src/ai/clients/openRouterModelClient');

const VALID_INPUT = {
  resumeText: 'Backend engineer experienced with Node.js and PostgreSQL.',
  jobDescription: 'Looking for a backend engineer with Node.js experience.',
};

function successResponse() {
  return {
    choices: [
      {
        message: {
          tool_calls: [
            {
              function: {
                name: 'submit_resume_review',
                arguments: JSON.stringify({
                  matchScore: 70,
                  missingKeywords: [],
                  suggestions: ['A.', 'B.'],
                }),
              },
            },
          ],
        },
      },
    ],
  };
}

describe('retry works through the real GroqModelClient', () => {
  it('recovers from one transient (429) failure and returns the validated result', async () => {
    const client = new GroqModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi
      .fn()
      .mockRejectedValueOnce(new Groq.RateLimitError(429, { message: 'rate limited' }, 'rate limited', {}))
      .mockResolvedValueOnce(successResponse());

    const result = await resumeReview(VALID_INPUT, { modelClient: client });

    expect(result).toEqual({ matchScore: 70, missingKeywords: [], suggestions: ['A.', 'B.'] });
    expect(client.client.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable (401) failure', async () => {
    const client = new GroqModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi
      .fn()
      .mockRejectedValue(new Groq.AuthenticationError(401, { message: 'invalid api key' }, 'invalid api key', {}));

    await expect(resumeReview(VALID_INPUT, { modelClient: client })).rejects.toThrow();
    expect(client.client.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});

describe('retry works through the real OpenRouterModelClient', () => {
  it('recovers from one transient (connection) failure and returns the validated result', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi
      .fn()
      .mockRejectedValueOnce(new OpenAI.APIConnectionError({ message: 'connection failed' }))
      .mockResolvedValueOnce(successResponse());

    const result = await resumeReview(VALID_INPUT, { modelClient: client });

    expect(result).toEqual({ matchScore: 70, missingKeywords: [], suggestions: ['A.', 'B.'] });
    expect(client.client.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable (400) failure', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi
      .fn()
      .mockRejectedValue(
        new OpenAI.BadRequestError(400, { message: 'invalid model' }, 'invalid model', new Headers()),
      );

    await expect(resumeReview(VALID_INPUT, { modelClient: client })).rejects.toThrow();
    expect(client.client.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
