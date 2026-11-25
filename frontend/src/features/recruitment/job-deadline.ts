const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const ISO_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})/;

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

export function normalizeJobDeadline(deadline?: string | null): string | null {
  if (!deadline || typeof deadline !== 'string') return null;
  const trimmed = deadline.trim();
  if (!trimmed) return null;
  const match = ISO_DATE_PATTERN.exec(trimmed);
  return match ? match[1] : null;
}

export function isJobDeadlineExpired(deadline?: string | null, now: Date = new Date()): boolean {
  const normalized = normalizeJobDeadline(deadline);
  if (!normalized) return false;
  return normalized < todayVietnamDate(now);
}

export function daysUntilDeadline(deadline?: string | null, now: Date = new Date()): number | null {
  const normalized = normalizeJobDeadline(deadline);
  if (!normalized) return null;
  const targetMs = Date.parse(`${normalized}T00:00:00Z`);
  const todayMs = Date.parse(`${todayVietnamDate(now)}T00:00:00Z`);
  if (!Number.isFinite(targetMs) || !Number.isFinite(todayMs)) return null;
  return Math.round((targetMs - todayMs) / 86_400_000);
}

export function formatDeadlineDate(deadline?: string | null): string {
  const normalized = normalizeJobDeadline(deadline);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
}

export function formatHiringProgress(hiredCount?: number, headcount?: number): string {
  const hired = Math.max(0, Number(hiredCount ?? 0));
  const target = Math.max(1, Number(headcount ?? 1));
  return `Đã tuyển ${hired}/${target}`;
}
