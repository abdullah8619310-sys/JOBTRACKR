require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Optional: the app (and CRUD tests) must keep working with no key configured.
  // Whichever AI_PROVIDER is selected fails clearly at call time if its key
  // is missing, rather than blocking the whole server from starting.
  GROQ_API_KEY: z.string().trim().min(1).optional(),
  OPENROUTER_API_KEY: z.string().trim().min(1).optional(),
  // Simple, explicit provider routing (Week 7 Phase 5) — no automatic
  // fallback between providers, just a manual switch. See ai/index.js's
  // createModelClient().
  AI_PROVIDER: z.enum(['groq', 'openrouter']).default('groq'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.issues);
  process.exit(1);
}

module.exports = parsed.data;
