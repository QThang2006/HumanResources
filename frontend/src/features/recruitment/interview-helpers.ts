export const INTERVIEW_CONFLICT_WINDOW_MINUTES = 45;

export function toDateTimeLocalInput(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function canManageInterview(
  result: string,
  applicationStatus: string,
  isOperator: boolean,
): boolean {
  return isOperator && result === 'PENDING' && applicationStatus === 'INTERVIEWING';
}

export function hasInterviewConflict(
  targetIso: string,
  existingTimesIso: string[],
  windowMinutes = INTERVIEW_CONFLICT_WINDOW_MINUTES,
): boolean {
  const targetMs = Date.parse(targetIso);
  if (!Number.isFinite(targetMs)) return false;
  const windowMs = windowMinutes * 60 * 1000;
  return existingTimesIso.some((value) => {
    const existingMs = Date.parse(value);
    return Number.isFinite(existingMs) && Math.abs(existingMs - targetMs) < windowMs;
  });
}
