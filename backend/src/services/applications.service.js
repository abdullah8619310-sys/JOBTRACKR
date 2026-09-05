const prisma = require('../lib/prisma');

const DEFAULT_STALE_DAYS = 7;

// Calendar-date cutoff (UTC midnight), not a raw `now() - N*24h` timestamp.
// `dateApplied` is always stored as UTC midnight of the picked day (see
// applications.validator.js's toUtcDateOnly), so comparing it against a
// raw timestamp cutoff would make "exactly N days ago" resolve differently
// depending on what time of day the query runs. Anchoring the cutoff to
// UTC midnight of (today - N days) makes "strictly older than N days" an
// unambiguous calendar-day boundary: a dateApplied of exactly N days ago
// equals the cutoff (not stale); N+1 days ago is before it (stale).
function getStaleCutoffDate(staleDays = DEFAULT_STALE_DAYS, referenceDate = new Date()) {
  return new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate() - staleDays,
    ),
  );
}

// Application data retrieval for the future Follow-up Agent. Returns only
// the fields that agent will need — not resumeText/jobDescription, which
// are large and unnecessary for identifying stale applications.
async function findStaleApplications({ staleDays = DEFAULT_STALE_DAYS } = {}) {
  const cutoff = getStaleCutoffDate(staleDays);

  return prisma.jobApplication.findMany({
    where: {
      dateApplied: { lt: cutoff },
    },
    orderBy: { dateApplied: 'asc' },
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      dateApplied: true,
      resumeVersion: true,
    },
  });
}

// Single-application staleness check for callers that already have one
// record in hand (e.g. the Follow-up endpoint) and shouldn't re-run the
// findMany query above just to test one row. Reuses the exact same cutoff
// computation as findStaleApplications, so there remains one definition of
// "stale" regardless of call site.
function isApplicationStale(dateApplied, staleDays = DEFAULT_STALE_DAYS) {
  return dateApplied < getStaleCutoffDate(staleDays);
}

module.exports = {
  findStaleApplications,
  getStaleCutoffDate,
  isApplicationStale,
  DEFAULT_STALE_DAYS,
};
