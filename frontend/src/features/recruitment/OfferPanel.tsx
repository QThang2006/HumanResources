import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Alert, buttonClass, errorText, Field, inputClass, secondaryClass } from './ui';
export interface OfferView {
    offerId: number;
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
}
export const offerLabels: Record<string, string> = { PENDING: 'Chờ phản hồi', ACCEPTED: 'Đã đồng ý nhận việc', DECLINED: 'Đã từ chối', EXPIRED: 'Đã hết hạn' };
const deliveryLabels: Record<string, string> = { PENDING: 'Đang chờ workflow', DISPATCH_FAILED: 'Chưa gọi được workflow', RUNNING: 'Workflow đã nhận, đang chờ xác nhận gửi', SMTP_ACCEPTED: 'Máy chủ email đã chấp nhận thư' };
export function OfferPanel({ applicationId, jobTitle, canCreate, changed, statusChanged }: {
    applicationId: number;
    jobTitle: string;
    canCreate: boolean;
    changed: () => void;
    statusChanged: (status: string | null) => void;
}) {
    const [offer, setOffer] = useState<OfferView | null>(null);
    const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [salary, setSalary] = useState(''), [startDate, setDate] = useState(''), [roleTitle, setTitle] = useState(jobTitle);
    async function refresh() {
        const rows = await apiClient.get<unknown, OfferView[]>(`/applications/${applicationId}/offers`);
        const value = rows[0] || null;
        setOffer(value);
        setLoaded(true);
        statusChanged(value?.status || null);
    }
    useEffect(() => { refresh().catch(e => setError(errorText(e))); }, [applicationId]);
    async function action(fn: () => Promise<unknown>) {
        setBusy(true);
        setError('');
        try {
            await fn();
            await refresh();
            changed();
        }
        catch (e) {
            setError(errorText(e));
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="space-y-3 rounded-xl border p-4">
    <h3 className="font-bold">Offer Letter · thời hạn 48 giờ</h3>
    {error && <Alert>{error}</Alert>}
    {!loaded && <p>Đang tải Offer...</p>}
    {offer ? <>
      <p><strong>{offerLabels[offer.status]}</strong> · {deliveryLabels[offer.deliveryStatus] || offer.deliveryStatus}</p>
      <p>{offer.jobTitle} · {offer.salary} · Nhận việc: {offer.startDate}</p>
      {offer.sentAt && <p>Hạn phản hồi: {new Date(offer.expiresAt).toLocaleString('vi-VN')}</p>}
      {offer.remindedAt && <p>Đã gửi nhắc nhở 24 giờ và báo HR.</p>}
      {['PENDING', 'DISPATCH_FAILED'].includes(offer.deliveryStatus) && <button disabled={busy} className={secondaryClass} onClick={() => action(() => apiClient.post(`/applications/${applicationId}/offer/retry`))}>Thử gửi lại qua workflow</button>}
    </> : loaded && canCreate ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); action(() => apiClient.post(`/applications/${applicationId}/offer`, { roleTitle, salary, startDate })); }}>
      <Field label="Vị trí nhận việc"><input required maxLength={200} className={inputClass} value={roleTitle} onChange={e => setTitle(e.target.value)}/></Field>
      <Field label="Mức lương và đơn vị"><input required maxLength={100} placeholder="Ví dụ: 15.000.000 VND/tháng (gross)" className={inputClass} value={salary} onChange={e => setSalary(e.target.value)}/></Field>
      <Field label="Ngày nhận việc"><input required type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} value={startDate} onChange={e => setDate(e.target.value)}/></Field>
      <p className="text-sm text-slate-600">Phát hành sẽ gửi thư tới ứng viên. Sau 24 giờ chưa phản hồi, hệ thống nhắc ứng viên và HR; sau 48 giờ Offer hết hạn.</p>
      <button disabled={busy} className={buttonClass}>{busy ? 'Đang phát hành...' : 'Phát hành và gửi Offer'}</button>
    </form> : loaded && <p>Chỉ phát hành sau khi vòng phỏng vấn mới nhất đạt.</p>}
    <button disabled={busy} className={secondaryClass} onClick={() => action(refresh)}>Cập nhật trạng thái Offer</button>
  </section>;
}
