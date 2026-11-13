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
