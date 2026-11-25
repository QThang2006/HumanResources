export interface OfferView {
  offerId: number;
  version?: number;
  candidateName: string;
  jobTitle: string;
  salary: string;
  startDate: string;
  status: string;
  deliveryStatus: string;
  expiresAt: string;
  sentAt: string | null;
  remindedAt: string | null;
  respondedAt: string | null;
  createdAt?: string;
}

export const offerLabels: Record<string, string> = {
  PENDING: 'Chờ phản hồi',
  ACCEPTED: 'Đã đồng ý nhận việc',
  DECLINED: 'Đã từ chối',
  EXPIRED: 'Đã hết hạn',
};

export const offerDeliveryLabels: Record<string, string> = {
  PENDING: 'Đang chờ workflow',
  DISPATCH_FAILED: 'Chưa gọi được workflow',
  RUNNING: 'Workflow đã nhận, đang chờ xác nhận gửi',
  SMTP_ACCEPTED: 'Máy chủ email đã chấp nhận thư',
};

export function resolveOfferVersion(offer: OfferView, indexFromNewest: number, total: number): number {
  if (typeof offer.version === 'number' && offer.version >= 1) return offer.version;
  return Math.max(1, total - indexFromNewest);
}

export function canIssueNewOffer(latestOffer: OfferView | null, canCreate: boolean): boolean {
  if (!canCreate) return false;
  if (!latestOffer) return true;
  return latestOffer.status === 'DECLINED' || latestOffer.status === 'EXPIRED';
}

export function nextOfferVersion(offers: OfferView[]): number {
  if (!offers.length) return 1;
  const maxVersion = Math.max(
    ...offers.map((offer, index) => resolveOfferVersion(offer, index, offers.length)),
  );
  return maxVersion + 1;
}

export function todayOfferInputDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}
