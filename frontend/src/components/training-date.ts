const vietnamDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function trainingDayKey(value: string | number | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(vietnamDate.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function trainingDateInput(daysFromToday: number, now: number = Date.now()): string {
  const date = new Date(`${trainingDayKey(now)}T00:00:00+07:00`);
  return trainingDayKey(date.getTime() + daysFromToday * 86400000);
}

export function trainingDeadline(value: string | null | undefined, completed: boolean, now = Date.now()) {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const due = new Date(dateOnly ? `${value}T23:59:59+07:00` : value);
  if (!Number.isFinite(due.getTime()) || (dateOnly && trainingDayKey(due) !== value)) return null;
  const remaining = due.getTime() - now;
  const alert = completed ? null : remaining < 0 ? 'overdue' : remaining <= 3 * 86400000 ? 'dueSoon' : null;
  const label = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(due);
  const alertLabel = alert === 'overdue' ? 'Quá hạn'
    : alert === 'dueSoon' ? (trainingDayKey(due) === trainingDayKey(now) ? 'Đến hạn hôm nay' : 'Sắp đến hạn') : null;
  return { label, alert, alertLabel, dateTime: due.toISOString() };
}
