const { ToolRegistry } = require('./toolRegistry');
const { resumeReview } = require('./skills/resumeReview');

// Shared registry instance for the app. Registration is pure bookkeeping
// (no API calls, no env access) so this is safe to create at module load.
const toolRegistry = new ToolRegistry();
toolRegistry.register('resume_review', resumeReview);

module.exports = { toolRegistry };
