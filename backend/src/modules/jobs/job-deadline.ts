const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const ISO_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Returns today's calendar date (YYYY-MM-DD) in Vietnam time (Asia/Ho_Chi_Minh),
 * independent of the host server timezone.
 */
export function todayVietnamDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

/**
 * Normalizes a Job.deadline value (MySQL DATE string or Date object) to YYYY-MM-DD.
 */
export function normalizeJobDeadline(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = ISO_DATE_PATTERN.exec(trimmed);
  if (match) return match[1];
  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

/**
 * Validates and parses a calendar date string (YYYY-MM-DD) for Job.deadline.
 * Returns Invalid Date when the format or calendar date does not exist (e.g. 2026-02-30).
 */
export function parseJobDeadlineInput(value: string): Date {
  if (typeof value !== 'string') return new Date(NaN);
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(NaN);
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    return new Date(NaN);
  }
  return parsed;
}

/**
 * A job deadline is inclusive of the entire selected Vietnam calendar day.
 * It is considered expired only when deadline < today (Asia/Ho_Chi_Minh).
 */
export function isJobDeadlineExpired(
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const normalized = normalizeJobDeadline(deadline);
  if (!normalized) return false;
  return normalized < todayVietnamDate(now);
}
