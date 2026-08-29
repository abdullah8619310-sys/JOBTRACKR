require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Optional: the app (and CRUD tests) must keep working with no key configured.
  // Only the Resume Reviewer Agent's analyze endpoint requires it, and it fails
  // clearly at call time if it's missing, rather than blocking the whole server.
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.issues);
  process.exit(1);
}

module.exports = parsed.data;
