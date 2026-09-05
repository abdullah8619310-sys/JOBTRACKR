const { OpenRouterModelClient } = require('../src/ai/clients/openRouterModelClient');

const SAMPLE_TOOL = {
  name: 'submit_follow_up_email',
  description: 'test tool',
  inputSchema: { type: 'object', properties: {} },
};

describe('OpenRouterModelClient', () => {
  it('requires an apiKey', () => {
    expect(() => new OpenRouterModelClient({})).toThrow('OpenRouterModelClient requires an apiKey');
  });

  it('sends a forced tool call and parses the JSON-string arguments into an object', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'submit_follow_up_email',
                  arguments: JSON.stringify({
                    subject: 'Follow-up',
                    body: 'Dear Hiring Team, ...',
                  }),
                },
              },
            ],
          },
        },
      ],
    });

    const result = await client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL });

    expect(result).toEqual({ subject: 'Follow-up', body: 'Dear Hiring Team, ...' });
    expect(client.client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'nvidia/nemotron-3.5-lightning:free',
        tool_choice: { type: 'function', function: { name: 'submit_follow_up_email' } },
      }),
    );
  });

  it('throws a clear error when no tool call is returned', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [{ message: {} }],
    });

    await expect(
      client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL }),
    ).rejects.toThrow('OpenRouter response did not include a tool call');
  });

  it('throws a clear error when tool call arguments are not valid JSON', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              { function: { name: 'submit_follow_up_email', arguments: '{not valid json' } },
            ],
          },
        },
      ],
    });

    await expect(
      client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL }),
    ).rejects.toThrow('OpenRouter tool call arguments were not valid JSON');
  });

  it('propagates an underlying API/network failure without swallowing it', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key' });
    client.client.chat.completions.create = vi.fn().mockRejectedValue(new Error('rate limited'));

    await expect(
      client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL }),
    ).rejects.toThrow('rate limited');
  });

  it('uses a custom model when provided', async () => {
    const client = new OpenRouterModelClient({ apiKey: 'fake-key', model: 'some/other-model:free' });
    client.client.chat.completions.create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [{ function: { name: 'submit_follow_up_email', arguments: '{}' } }],
          },
        },
      ],
    });

    await client.generate({ system: 'sys', prompt: 'p', tool: SAMPLE_TOOL });

    expect(client.client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'some/other-model:free' }),
    );
  });
});
