const { z } = require('zod');

// Mirrors the ApplicationStatus enum in prisma/schema.prisma
const applicationStatusEnum = z.enum([
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]);

// Shared field shape, without the create-only `status` default — applying
// `.partial()` to a field with `.default()` still fills it in on a missing
// key, which broke the "at least one field" check on empty update bodies.
const applicationShape = {
  company: z.string().trim().min(1, 'company is required'),
  role: z.string().trim().min(1, 'role is required'),
  status: applicationStatusEnum,
  dateApplied: z.coerce.date({ error: 'dateApplied must be a valid date' }),
  resumeVersion: z.string().trim().min(1, 'resumeVersion is required'),
  resumeText: z.string().trim().min(1, 'resumeText is required'),
  jobDescription: z.string().trim().min(1, 'jobDescription is required'),
};

// Calendar-date-only comparison (UTC), not raw timestamp comparison —
// `dateApplied` is stored as UTC midnight of the picked day with no
// meaningful time component, while `createdAt`/`now()` carry real time.
// Comparing raw timestamps would wrongly reject "applied today" on any day
// after midnight UTC.
function toUtcDateOnly(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const createApplicationSchema = z
  .object({
    ...applicationShape,
    status: applicationShape.status.optional().default('APPLIED'),
  })
  .refine((data) => toUtcDateOnly(data.dateApplied) >= toUtcDateOnly(new Date()), {
    message: 'dateApplied cannot be before today — a record cannot be created for a date earlier than its own creation date',
    path: ['dateApplied'],
  });

const updateApplicationSchema = z
  .object(applicationShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one field must be provided',
  });

const idParamSchema = z.object({
  id: z.string().trim().min(1, 'id is required'),
});

module.exports = {
  applicationStatusEnum,
  createApplicationSchema,
  updateApplicationSchema,
  idParamSchema,
  toUtcDateOnly,
};
