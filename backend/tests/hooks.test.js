const { withLogging } = require('../src/ai/hooks');

describe('withLogging', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs a success entry and returns the wrapped result', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const wrapped = withLogging('resume_review', fn);

    const result = await wrapped({ resumeText: 'abc', jobDescription: 'xyz' }, {});

    expect(result).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledTimes(1);

    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry).toMatchObject({
      type: 'ai_call',
      agentName: 'resume_review',
      success: true,
    });
    expect(typeof entry.timestamp).toBe('string');
    expect(typeof entry.inputSize).toBe('number');
    expect(entry.inputSize).toBeGreaterThan(0);
  });

  it('logs a failure entry and still rejects with the original error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('model exploded'));
    const wrapped = withLogging('resume_review', fn);

    await expect(wrapped({ resumeText: 'abc' })).rejects.toThrow('model exploded');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry).toMatchObject({
      type: 'ai_call',
      agentName: 'resume_review',
      success: false,
      error: 'model exploded',
    });
  });
});
