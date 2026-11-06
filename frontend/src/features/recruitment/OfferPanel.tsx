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
    return <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold text-slate-900">Offer Letter</h3>
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Thời hạn 48 giờ</span>
    </div>
    {error && <Alert>{error}</Alert>}
    {!loaded && <p role="status" className="text-sm text-slate-500">Đang tải Offer...</p>}
    {offer ? <>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className={'rounded-full border px-2.5 py-1 font-semibold ' + (offer.status === 'ACCEPTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : offer.status === 'DECLINED' ? 'border-rose-200 bg-rose-50 text-rose-700' : offer.status === 'EXPIRED' ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-800')}>{offerLabels[offer.status]}</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">{deliveryLabels[offer.deliveryStatus] || offer.deliveryStatus}</span>
      </div>
      <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0"><dt className="text-xs font-medium text-slate-500">Vị trí nhận việc</dt><dd className="mt-1 break-words font-semibold text-slate-900">{offer.jobTitle}</dd></div>
        <div className="min-w-0"><dt className="text-xs font-medium text-slate-500">Mức lương</dt><dd className="mt-1 break-words font-semibold text-emerald-700">{offer.salary}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Ngày nhận việc</dt><dd className="mt-1 font-medium text-slate-700">{offer.startDate}</dd></div>
      </dl>
      {offer.sentAt && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Hạn phản hồi: {new Date(offer.expiresAt).toLocaleString('vi-VN')}</p>}
      {offer.remindedAt && <p className="text-sm text-slate-600">Đã gửi nhắc nhở 24 giờ và báo HR.</p>}
      {['PENDING', 'DISPATCH_FAILED'].includes(offer.deliveryStatus) && <button disabled={busy} className={secondaryClass} onClick={() => action(() => apiClient.post(`/applications/${applicationId}/offer/retry`))}>Thử gửi lại qua workflow</button>}
    </> : loaded && canCreate ? <form className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={e => { e.preventDefault(); action(() => apiClient.post(`/applications/${applicationId}/offer`, { roleTitle, salary, startDate })); }}>
      <Field label="Vị trí nhận việc"><input required maxLength={200} className={inputClass} value={roleTitle} onChange={e => setTitle(e.target.value)}/></Field>
      <Field label="Mức lương và đơn vị"><input required maxLength={100} placeholder="Ví dụ: 15.000.000 VND/tháng (gross)" className={inputClass} value={salary} onChange={e => setSalary(e.target.value)}/></Field>
      <Field label="Ngày nhận việc"><input required type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} value={startDate} onChange={e => setDate(e.target.value)}/></Field>
      <p className="text-sm leading-relaxed text-slate-600">Phát hành sẽ gửi thư tới ứng viên. Sau 24 giờ chưa phản hồi, hệ thống nhắc ứng viên và HR; sau 48 giờ Offer hết hạn.</p>
      <button disabled={busy} className={buttonClass}>{busy ? 'Đang phát hành...' : 'Phát hành và gửi Offer'}</button>
    </form> : loaded && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Chỉ phát hành sau khi vòng phỏng vấn mới nhất đạt.</p>}
    <div className="border-t border-slate-200 pt-4"><button disabled={busy} className={secondaryClass} onClick={() => action(refresh)}>Cập nhật trạng thái Offer</button></div>
  </section>;
}
