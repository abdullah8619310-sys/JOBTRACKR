// Small, provider-agnostic retry helper (Week 7 Phase 6). Both `groq-sdk`
// and `openai` (used for OpenRouter) are generated from the same
// OpenAI-compatible SDK tooling and throw errors with the identical shape —
// confirmed directly (not assumed): a numeric `.status` for real HTTP
// responses (429, 5xx, etc.), and a `.constructor.name` of
// `APIConnectionError`/`APIConnectionTimeoutError` for network-level
// failures that never got an HTTP response at all. Checking these two
// generic signals means this file never imports either SDK and never
// branches on which provider is in use.
const RETRYABLE_CONNECTION_ERROR_NAMES = new Set([
  'APIConnectionError',
  'APIConnectionTimeoutError',
]);

// Retryable: temporary network failure/timeout, HTTP 429 (rate limit), HTTP
// 5xx (provider-side error). Everything else — missing/invalid API key
// (401/403), invalid request/model (400/404), and, critically, our own
// skills' plain Errors/AppErrors for malformed tool-call output — is
// deliberately NOT retryable. A short, fixed list on purpose; this is not
// meant to guess at every possible transient condition.
function isRetryableError(error) {
  if (!error) return false;

  if (RETRYABLE_CONNECTION_ERROR_NAMES.has(error.constructor?.name)) {
    return true;
  }

  const { status } = error;
  if (typeof status !== 'number') return false;

  return status === 429 || status >= 500;
}

const MAX_ATTEMPTS = 2;

// Calls `fn` once; if it throws a retryable error, calls it exactly one
// more time — never more (MAX_ATTEMPTS is fixed at 2, no backoff, no
// unbounded loop). A non-retryable error propagates immediately on the
// first attempt without wasting a second call. Only wrap the actual
// model-client call in this — never the output-validation step that comes
// after it, so a structurally invalid (but successfully-returned) response
// is never retried just because it failed Zod validation.
async function withRetry(fn) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryableError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

module.exports = { withRetry, isRetryableError, MAX_ATTEMPTS };
