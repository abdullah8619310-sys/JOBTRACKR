const { withRetry, isRetryableError, MAX_ATTEMPTS } = require('../src/ai/retry');

// Named to match the real SDK error class names exactly (both groq-sdk and
// openai export classes with these same names) — this proves isRetryableError
// works structurally, without importing either real SDK into this test.
class RateLimitError extends Error {
  constructor() {
    super('rate limited');
    this.status = 429;
  }
}

class InternalServerError extends Error {
  constructor() {
    super('server error');
    this.status = 500;
  }
}

class APIConnectionError extends Error {
  constructor() {
    super('connection failed');
  }
}

class BadRequestError extends Error {
  constructor() {
    super('bad request');
    this.status = 400;
  }
}

class AuthenticationError extends Error {
  constructor() {
    super('bad api key');
    this.status = 401;
  }
}

describe('isRetryableError', () => {
  it('treats 429 rate-limit errors as retryable', () => {
    expect(isRetryableError(new RateLimitError())).toBe(true);
  });

  it('treats 5xx provider errors as retryable', () => {
    expect(isRetryableError(new InternalServerError())).toBe(true);
  });

  it('treats connection-level (no HTTP response) errors as retryable', () => {
    expect(isRetryableError(new APIConnectionError())).toBe(true);
  });

  it('treats 400 bad-request errors as non-retryable', () => {
    expect(isRetryableError(new BadRequestError())).toBe(false);
  });

  it('treats 401 authentication errors (e.g. missing/invalid key) as non-retryable', () => {
    expect(isRetryableError(new AuthenticationError())).toBe(false);
  });

  it('treats a plain Error (e.g. malformed-output failures) as non-retryable', () => {
    expect(isRetryableError(new Error('Groq response did not include a tool call'))).toBe(false);
  });

  it('treats a missing/undefined error as non-retryable', () => {
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the result on the first successful attempt without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await withRetry(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once after a retryable failure and returns the second attempt\'s result', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError())
      .mockResolvedValueOnce('ok on second try');

    const result = await withRetry(fn);

    expect(result).toBe('ok on second try');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the final error when both attempts fail with a retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new InternalServerError());

    await expect(withRetry(fn)).rejects.toThrow('server error');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable error — fails after exactly one attempt', async () => {
    const fn = vi.fn().mockRejectedValue(new BadRequestError());

    await expect(withRetry(fn)).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('never calls fn more than MAX_ATTEMPTS times, even if failures continue', async () => {
    const fn = vi.fn().mockRejectedValue(new RateLimitError());

    await expect(withRetry(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(MAX_ATTEMPTS).toBe(2);
  });
});
