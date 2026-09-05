const { z } = require('zod');

// Structured output contract for the Follow-up Agent: a short, editable
// email draft. Kept intentionally minimal — subject/body only, per the
// approved proposal's output for this feature.
const followUpOutputSchema = z.object({
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

module.exports = { followUpOutputSchema };
