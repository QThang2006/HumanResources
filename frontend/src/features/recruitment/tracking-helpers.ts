import type { ApplicationStatus } from './types';

export const TRACKING_CODE_REGEX = /^[A-Z0-9-]{6,32}$/;

export interface TrackingStep {
  key: Exclude<ApplicationStatus, 'REJECTED'>;
  label: string;
  shortDescription: string;
}

export const TRACKING_STEPS: readonly TrackingStep[] = [
  {
    key: 'APPLIED',
    label: 'Tiếp nhận hồ sơ',
    shortDescription: 'Hồ sơ đã được lưu trên hệ thống và chờ bộ phận tuyển dụng xem xét.',
  },
  {
    key: 'INTERVIEWING',
    label: 'Phỏng vấn',
    shortDescription: 'Hồ sơ đang trong giai đoạn trao đổi và phỏng vấn chuyên môn.',
  },
  {
    key: 'OFFERED',
    label: 'Đề xuất nhận việc',
    shortDescription: 'Bộ phận tuyển dụng đã hoặc đang gửi thư mời nhận việc (Offer).',
  },
  {
    key: 'HIRED',
    label: 'Nhận việc',
    shortDescription: 'Chúc mừng bạn đã trúng tuyển và hoàn tất thủ tục nhận việc.',
  },
];

export interface TrackingStatusMeta {
  label: string;
  headline: string;
  description: string;
  badgeClass: string;
  activeStepIndex: number;
  isRejected: boolean;
}

export function normalizeTrackingCode(raw: string): string {
  return String(raw || '').trim().toUpperCase();
}

export function isValidTrackingCode(raw: string): boolean {
  return TRACKING_CODE_REGEX.test(normalizeTrackingCode(raw));
}

export function getTrackingStatusMeta(status: ApplicationStatus): TrackingStatusMeta {
  switch (status) {
    case 'APPLIED':
      return {
        label: 'Đã tiếp nhận hồ sơ',
        headline: 'Hồ sơ của bạn đã được tiếp nhận thành công',
        description:
          'Bộ phận Tuyển dụng đang rà soát hồ sơ của bạn. Chúng tôi sẽ liên hệ qua email nếu hồ sơ phù hợp với bước tiếp theo.',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
        activeStepIndex: 0,
        isRejected: false,
      };
    case 'INTERVIEWING':
      return {
        label: 'Đang phỏng vấn',
        headline: 'Hồ sơ của bạn đang ở vòng phỏng vấn',
        description:
          'Vui lòng kiểm tra hộp thư email để xem thông tin chi tiết về lịch phỏng vấn và đường dẫn tham gia (nếu phỏng vấn trực tuyến).',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
        activeStepIndex: 1,
        isRejected: false,
      };
    case 'OFFERED':
      return {
        label: 'Đề xuất nhận việc',
        headline: 'Bạn đã được đề xuất nhận việc (Offer)',
        description:
          'Vui lòng kiểm tra email để xem thư mời nhận việc và phản hồi xác nhận trong thời hạn quy định.',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
        activeStepIndex: 2,
        isRejected: false,
      };
    case 'HIRED':
      return {
        label: 'Đã nhận việc',
        headline: 'Chúc mừng bạn đã chính thức gia nhập đội ngũ!',
        description:
          'Hồ sơ tuyển dụng của bạn đã hoàn tất. Bộ phận Nhân sự sẽ gửi hướng dẫn hội nhập (Onboarding) qua email.',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        activeStepIndex: 3,
        isRejected: false,
      };
    case 'REJECTED':
      return {
        label: 'Đã kết thúc quy trình',
        headline: 'Cảm ơn bạn đã dành thời gian ứng tuyển',
        description:
          'Rất tiếc chúng tôi chưa thể đồng hành cùng bạn ở vị trí này trong đợt tuyển dụng hiện tại. Hồ sơ của bạn vẫn được lưu cho các cơ hội phù hợp hơn trong tương lai.',
        badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
        activeStepIndex: -1,
        isRejected: true,
      };
  }
}

export function formatTrackingDateTime(value?: string | null): string {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}
