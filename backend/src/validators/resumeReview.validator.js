const { z } = require('zod');

// Structured output contract for the Resume Reviewer Agent, per the approved
// Phase 3 proposal: match score, missing keywords, 2-3 improvement suggestions.
const resumeReviewOutputSchema = z.object({
  matchScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()),
  suggestions: z.array(z.string()).min(2).max(3),
});

module.exports = { resumeReviewOutputSchema };
