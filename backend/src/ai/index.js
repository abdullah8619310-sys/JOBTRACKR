const { ToolRegistry } = require('./toolRegistry');
const { ModelClient } = require('./modelClient');
const { AgentRunner } = require('./agentRunner');
const { NotImplementedError } = require('./errors');
const { resumeReview, RESUME_REVIEW_TOOL } = require('./skills/resumeReview');
const { followUp, FOLLOW_UP_TOOL } = require('./skills/followUp');
const { toolRegistry, GroqModelClient, OpenRouterModelClient } = require('./registry');
const { withLogging } = require('./hooks');
const env = require('../config/env');
const AppError = require('../utils/AppError');

// Simple, explicit provider routing (Week 7 Phase 5): AI_PROVIDER selects
// which concrete ModelClient gets constructed. No automatic fallback if the
// selected provider fails — that's a later phase. Controllers call this
// instead of ever referencing GroqModelClient/OpenRouterModelClient
// directly, so they stay provider-agnostic.
//
// Deliberately reads `module.exports.GroqModelClient` /
// `module.exports.OpenRouterModelClient` (a live property lookup on this
// module's own exports) rather than closing over the destructured local
// constants above. Existing tests swap out the model client by mutating
// `ai.GroqModelClient` on the shared, cached module object (see
// analyze.test.js) — a plain destructured local would not see that
// mutation, silently defeating the mock and risking a real network call.
function createModelClient() {
  if (env.AI_PROVIDER === 'openrouter') {
    if (!env.OPENROUTER_API_KEY) {
      throw new AppError(
        'AI provider is not configured on this server (missing OPENROUTER_API_KEY)',
        503,
      );
    }
    return new module.exports.OpenRouterModelClient({ apiKey: env.OPENROUTER_API_KEY });
  }

  if (!env.GROQ_API_KEY) {
    throw new AppError(
      'AI provider is not configured on this server (missing GROQ_API_KEY)',
      503,
    );
  }
  return new module.exports.GroqModelClient({ apiKey: env.GROQ_API_KEY });
}

module.exports = {
  ToolRegistry,
  ModelClient,
  AgentRunner,
  NotImplementedError,
  GroqModelClient,
  OpenRouterModelClient,
  resumeReview,
  RESUME_REVIEW_TOOL,
  followUp,
  FOLLOW_UP_TOOL,
  toolRegistry,
  withLogging,
  createModelClient,
};
