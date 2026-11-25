/**
 * Vietnam calendar-day and timezone utilities (`Asia/Ho_Chi_Minh`, UTC+07:00).
 *
 * All calculations are deterministic and completely independent of the host OS
 * or Docker container timezone (`process.env.TZ`), preventing midnight / early-morning
 * (00:00–06:59 VN) day-boundary bugs when the backend runs in UTC.
 */

export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const VIETNAM_UTC_OFFSET = '+07:00';
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface VietnamDateParts {
  year: number;
  month: number;
  day: number;
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // DD/MM
  dayOfWeek: number; // 0 = Sunday (CN) .. 6 = Saturday (T7)
}

export interface VietnamDayBounds extends VietnamDateParts {
  startOfDay: Date; // YYYY-MM-DDT00:00:00.000+07:00
  endOfDay: Date; // YYYY-MM-DDT23:59:59.999+07:00
}

export interface VietnamRecentDay extends VietnamDayBounds {
  isToday: boolean;
}

const vietnamDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Extracts Vietnam calendar date components (YYYY-MM-DD, DD/MM, weekday)
 * from any Date instance regardless of host timezone.
 */
export function getVietnamDateParts(date: Date = new Date()): VietnamDateParts {
  const parts = vietnamDateFormatter.formatToParts(date);
  let yearStr = '';
  let monthStr = '';
  let dayStr = '';

  for (const part of parts) {
    if (part.type === 'year') yearStr = part.value;
    else if (part.type === 'month') monthStr = part.value;
    else if (part.type === 'day') dayStr = part.value;
  }

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  return {
    year,
    month,
    day,
    dateKey: `${yearStr}-${monthStr}-${dayStr}`,
    displayDate: `${dayStr}/${monthStr}`,
    dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/**
 * Shifts a Vietnam calendar date key (`YYYY-MM-DD`) by `offsetDays`
 * (negative for past days, positive for future days).
 */
export function shiftVietnamDateKey(dateKey: string, offsetDays: number): string {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid Vietnam date key: "${dateKey}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays));

  const y = String(shifted.getUTCFullYear()).padStart(4, '0');
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns exact `[00:00:00.000+07:00, 23:59:59.999+07:00]` UTC Date bounds
 * for the Vietnam calendar day containing `dateOrKey`.
 */
export function getVietnamDayBounds(dateOrKey: Date | string = new Date()): VietnamDayBounds {
  let parts: VietnamDateParts;

  if (typeof dateOrKey === 'string') {
    const match = DATE_KEY_PATTERN.exec(dateOrKey.trim());
    if (!match) {
      throw new Error(`Invalid Vietnam date key: "${dateOrKey}"`);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    parts = {
      year,
      month,
      day,
      dateKey: `${match[1]}-${match[2]}-${match[3]}`,
      displayDate: `${match[3]}/${match[2]}`,
      dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    };
  } else {
    parts = getVietnamDateParts(dateOrKey);
  }

  return {
    ...parts,
    startOfDay: new Date(`${parts.dateKey}T00:00:00.000${VIETNAM_UTC_OFFSET}`),
    endOfDay: new Date(`${parts.dateKey}T23:59:59.999${VIETNAM_UTC_OFFSET}`),
  };
}

/**
 * Returns inclusive `[startDate, endDate]` bounds covering the last `days`
 * Vietnam calendar days ending today (e.g., `days = 7` -> today - 6 days 00:00:00+07:00
 * through today 23:59:59.999+07:00).
 */
export function getVietnamDayRange(
  days: number = 7,
  now: Date = new Date(),
): {
  startDate: Date;
  endDate: Date;
  startDateKey: string;
  endDateKey: string;
} {
  const safeDays = Math.max(1, Math.floor(days));
  const todayBounds = getVietnamDayBounds(now);
  const startDateKey = shiftVietnamDateKey(todayBounds.dateKey, -(safeDays - 1));
  const startBounds = getVietnamDayBounds(startDateKey);

  return {
    startDate: startBounds.startOfDay,
    endDate: todayBounds.endOfDay,
    startDateKey,
    endDateKey: todayBounds.dateKey,
  };
}

/**
 * Computes the exact calendar-day difference (`later - earlier`) in Vietnam time.
 * Returns `0` for timestamps on the same Vietnam calendar day, `1` for consecutive days, etc.
 */
export function getVietnamCalendarDayDiff(
  laterDate: Date | string,
  earlierDate: Date | string,
): number {
  const laterStart = getVietnamDayBounds(
    laterDate instanceof Date ? laterDate : new Date(laterDate),
  ).startOfDay;
  const earlierStart = getVietnamDayBounds(
    earlierDate instanceof Date ? earlierDate : new Date(earlierDate),
  ).startOfDay;

  return Math.round((laterStart.getTime() - earlierStart.getTime()) / MS_PER_DAY);
}

/**
 * Builds an ordered list of the most recent `days` Vietnam calendar days
 * from oldest (`days - 1` days ago) to today (`isToday = true`).
 */
export function getVietnamRecentDays(
  days: number = 7,
  now: Date = new Date(),
): VietnamRecentDay[] {
  const safeDays = Math.max(1, Math.floor(days));
  const todayKey = getVietnamDateParts(now).dateKey;
  const result: VietnamRecentDay[] = [];

  for (let offset = safeDays - 1; offset >= 0; offset--) {
    const key = shiftVietnamDateKey(todayKey, -offset);
    result.push({
      ...getVietnamDayBounds(key),
      isToday: offset === 0,
    });
  }

  return result;
}
