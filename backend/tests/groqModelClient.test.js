const { GroqModelClient } = require('../src/ai/clients/groqModelClient');

const SAMPLE_TOOL = {
  name: 'submit_resume_review',
  description: 'test tool',
  inputSchema: { type: 'object', properties: {} },
};

describe('GroqModelClient', () => {
  it('requires an apiKey', () => {
    expect(() => new GroqModelClient({})).toThrow('GroqModelClient requires an apiKey');
  });

  it('sends a forced tool call and parses the JSON-string arguments into an object', async () => {
    const client = new GroqModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'submit_resume_review',
                  arguments: JSON.stringify({
                    matchScore: 80,
                    missingKeywords: [],
                    suggestions: ['A.', 'B.'],
                  }),
                },
              },
            ],
          },
        },
      ],
    });

    const result = await client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL });

    expect(result).toEqual({ matchScore: 80, missingKeywords: [], suggestions: ['A.', 'B.'] });
    expect(client.client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-oss-120b',
        tool_choice: { type: 'function', function: { name: 'submit_resume_review' } },
      }),
    );
  });

  it('throws a clear error when no tool call is returned', async () => {
    const client = new GroqModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [{ message: {} }],
    });

    await expect(
      client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL }),
    ).rejects.toThrow('Groq response did not include a tool call');
  });

  it('throws a clear error when tool call arguments are not valid JSON', async () => {
    const client = new GroqModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              { function: { name: 'submit_resume_review', arguments: '{not valid json' } },
            ],
          },
        },
      ],
    });

    await expect(
      client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL }),
    ).rejects.toThrow('Groq tool call arguments were not valid JSON');
  });

  it('propagates an underlying API/network failure without swallowing it', async () => {
    const client = new GroqModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockRejectedValue(new Error('rate limited'));

    await expect(
      client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL }),
    ).rejects.toThrow('rate limited');
  });
});
