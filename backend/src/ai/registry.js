const { ToolRegistry } = require('./toolRegistry');
const { resumeReview } = require('./skills/resumeReview');
const { GroqModelClient } = require('./clients/groqModelClient');

// Shared registry instance for the app. Registration is pure bookkeeping
// (no API calls, no env access) so this is safe to create at module load.
const toolRegistry = new ToolRegistry();
toolRegistry.register('resume_review', resumeReview);

// Composition root for which concrete ModelClient the app uses. Re-exported
// (not eagerly instantiated — the API key isn't available/required here)
// so callers construct it as `new ai.GroqModelClient({ apiKey })` only once
// they've already confirmed a key is configured.
module.exports = { toolRegistry, GroqModelClient };
