const { ToolRegistry } = require('./toolRegistry');
const { resumeReview } = require('./skills/resumeReview');
const { followUp } = require('./skills/followUp');
const { GroqModelClient } = require('./clients/groqModelClient');
const { OpenRouterModelClient } = require('./clients/openRouterModelClient');

// Shared registry instance for the app. Registration is pure bookkeeping
// (no API calls, no env access) so this is safe to create at module load.
const toolRegistry = new ToolRegistry();
toolRegistry.register('resume_review', resumeReview);
toolRegistry.register('draft_followup', followUp);

// Composition root for which concrete ModelClient classes the app has
// available. Re-exported (not eagerly instantiated — no API key is
// available/required here) so callers construct one only once they've
// confirmed a key is configured. Actual provider selection (which of these
// two gets used) lives in index.js's createModelClient(), not here.
module.exports = { toolRegistry, GroqModelClient, OpenRouterModelClient };
