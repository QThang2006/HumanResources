import type { OffboardingInput, OffboardingStatus } from '../api/offboarding.api';

export const offboardingStatusLabels: Record<OffboardingStatus, string> = {
  APPROVED: 'Đã duyệt · chờ điều phối', IN_PROGRESS: 'Đang điều phối', COMPLETED: 'Đã gửi đủ thông báo',
  PARTIAL: 'Gửi một phần', FAILED: 'Gửi thất bại', CANCELLED: 'Đã hủy',
};
export function vietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function createOffboardingDraft(employee: { id: number; email: string }): OffboardingInput {
  return { userId: employee.id, lastWorkingDate: vietnamToday(), personalEmail: employee.email.trim(), reason: '', assetNotes: '', exitSurveyUrl: '' };
}
export function validateOffboarding(input: OffboardingInput, today: string): string {
  const date = new Date(`${input.lastWorkingDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.lastWorkingDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.lastWorkingDate) return 'Ngày làm việc cuối không hợp lệ.';
  if (input.lastWorkingDate < today) return 'Ngày làm việc cuối không được nằm trong quá khứ.';
  if (!input.personalEmail || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(input.personalEmail.trim()) || input.personalEmail.length > 255) return 'Nhập email nhận thông báo hợp lệ để nhận thư và khảo sát.';
  if ([input.reason, input.assetNotes].some(value => value?.includes('\uFFFD'))) return 'Nội dung có ký tự không hợp lệ. Hãy nhập lại phần tiếng Việt bị lỗi.';
  if (input.exitSurveyUrl) {
    try { const url = new URL(input.exitSurveyUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || input.exitSurveyUrl.length > 1000) throw Error(); }
    catch { return 'Đường dẫn khảo sát phải là địa chỉ HTTP hoặc HTTPS hợp lệ.'; }
  }
  return '';
}
