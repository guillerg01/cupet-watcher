// A full Cuba fuel-catalog sweep on mobile data often needs 6–15 minutes.
// Previous 5/8 minute windows caused CLAIMED jobs to expire before ingest finished.
export const ASSIGNMENT_TTL_MS = 30 * 60 * 1000;
export const CLAIM_TIMEOUT_MS = 25 * 60 * 1000;
export const MAX_ASSIGNMENT_ATTEMPTS = 3;
