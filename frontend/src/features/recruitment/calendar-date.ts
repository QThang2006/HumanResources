export type CalendarPeriod = 'week' | 'month';
const ZONE = 'Asia/Ho_Chi_Minh';
const DAY = 86400000;
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export const timeLabel = (date: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(date));
export const dateLabel = (date: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: ZONE, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
export const shortDateLabel = (key: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: ZONE, day: '2-digit', month: '2-digit' }).format(new Date(key + 'T12:00:00+07:00'));

export function dayKey(value: string | Date = new Date()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function civilDate(key: string) { return new Date(key + 'T00:00:00Z'); }
export function shiftDay(key: string, amount: number) { return new Date(civilDate(key).getTime() + amount * DAY).toISOString().slice(0, 10); }
export function weekStart(key: string) { return shiftDay(key, -((civilDate(key).getUTCDay() + 6) % 7)); }
export function shiftPeriod(key: string, period: CalendarPeriod, direction: number) {
  if (period === 'week') return shiftDay(key, direction * 7);
  const date = civilDate(key); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction, 1)).toISOString().slice(0, 10);
}
export function calendarWindow(key: string, period: CalendarPeriod) {
  const first = period === 'week' ? weekStart(key) : weekStart(key.slice(0, 8) + '01');
  const days = Array.from({ length: period === 'week' ? 7 : 42 }, (_, n) => shiftDay(first, n));
  return { days, from: first + 'T00:00:00+07:00', to: shiftDay(first, days.length) + 'T00:00:00+07:00' };
}
export function periodLabel(key: string, period: CalendarPeriod) {
  if (period === 'month') return new Intl.DateTimeFormat('vi-VN', { timeZone: ZONE, month: 'long', year: 'numeric' }).format(new Date(key + 'T12:00:00+07:00'));
  const first = weekStart(key); return shortDateLabel(first) + ' – ' + shortDateLabel(shiftDay(first, 6)) + '/' + shiftDay(first, 6).slice(0, 4);
}
export function safeMeetLink(value: string | null) {
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(value || '') ? value : null;
}
