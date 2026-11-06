import { BadRequestException } from '@nestjs/common';
import { ReviewReminderPhase } from '../../entities/performance-review-reminder.entity';

export interface ReviewCalendarDates {
  reviewPeriod: string;
  openingDate: string;
  reminderDate: string;
  deadline: string;
}
export function vietnamDate(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validateReviewPeriod(period: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '') || Number(period.slice(0, 4)) < 2000 || Number(period.slice(0, 4)) > 2100) {
    throw new BadRequestException('Kỳ đánh giá phải có dạng YYYY-MM, trong khoảng năm 2000–2100.');
  }
}
export function defaultReviewCalendar(period: string): ReviewCalendarDates {
  validateReviewPeriod(period);
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { reviewPeriod: period, openingDate: `${period}-25`, reminderDate: `${period}-28`, deadline: `${period}-${lastDay}` };
}
export function validateReviewCalendar(period: string, value: Omit<ReviewCalendarDates, 'reviewPeriod'>): ReviewCalendarDates {
  validateReviewPeriod(period);
  for (const [key, label] of [['openingDate', 'Ngày mở kỳ'], ['reminderDate', 'Ngày nhắc lần hai'], ['deadline', 'Hạn hoàn thành']]) {
    const date = value?.[key];
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 7) !== period || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      throw new BadRequestException(`${label} phải là ngày hợp lệ trong kỳ ${period}.`);
    }
  }
  if (!(value.openingDate < value.reminderDate && value.reminderDate <= value.deadline)) {
    throw new BadRequestException('Ngày mở kỳ phải trước ngày nhắc lần hai; hạn hoàn thành không được trước ngày nhắc.');
  }
  return { reviewPeriod: period, openingDate: value.openingDate, reminderDate: value.reminderDate, deadline: value.deadline };
}
export function reviewPhaseOnDate(calendar: ReviewCalendarDates, date: string): ReviewReminderPhase | null {
  return date === calendar.openingDate ? ReviewReminderPhase.OPENING : date === calendar.reminderDate ? ReviewReminderPhase.SECOND_REMINDER : null;
}
