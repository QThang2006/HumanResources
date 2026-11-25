import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { offerLabels, type OfferView } from '../features/recruitment/offer-helpers';
import { Alert, buttonClass, secondaryClass, errorText } from '../features/recruitment/ui';
export function OfferResponsePage() {
    const { token } = useParams();
    const [offer, setOffer] = useState<OfferView | null>(null), [error, setError] = useState('');
    const [busy, setBusy] = useState(false), [choice, setChoice] = useState<'accept' | 'decline' | null>(null);
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'no-referrer';
        document.head.appendChild(meta);
        apiClient.get<unknown, OfferView>(`/offers/${token}`).then(setOffer).catch(e => setError(errorText(e)));
        return () => meta.remove();
    }, [token]);
    async function submit() {
        setBusy(true);
        setError('');
        try {
            setOffer(await apiClient.post<unknown, OfferView>(`/offers/${token}/${choice}`));
            setChoice(null);
        }
        catch (e) {
            setError(errorText(e));
        }
        finally {
            setBusy(false);
        }
    }
    return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-blue-700">TalentHunt ATS</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thư mời nhận việc</h1>
          {offer?.version && offer.version > 1 && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Phiên bản v{offer.version}
            </span>
          )}
        </div>
      </header>
      <div className="mt-6 space-y-5">
        {error && <Alert>{error}</Alert>}
        {!offer && !error && <p role="status" className="text-sm text-slate-500">Đang tải thư mời...</p>}
        {offer && <>
          <p className="text-sm leading-relaxed text-slate-700">Kính gửi <strong className="text-slate-900">{offer.candidateName}</strong>,</p>
          <dl className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div className="min-w-0"><dt className="font-medium text-slate-500">Vị trí</dt><dd className="mt-1 break-words font-semibold text-slate-900">{offer.jobTitle}</dd></div>
            <div className="min-w-0"><dt className="font-medium text-slate-500">Mức lương</dt><dd className="mt-1 break-words font-semibold text-emerald-700">{offer.salary}</dd></div>
            <div><dt className="font-medium text-slate-500">Ngày nhận việc</dt><dd className="mt-1 font-semibold text-slate-900">{offer.startDate}</dd></div>
            <div><dt className="font-medium text-slate-500">Trạng thái</dt><dd className="mt-1 font-semibold text-slate-900">{offerLabels[offer.status]}</dd></div>
          </dl>
          {offer.sentAt ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Hạn phản hồi: {new Date(offer.expiresAt).toLocaleString('vi-VN')}</p> : <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Thư đang được xử lý. Vui lòng tải lại sau ít phút.</p>}
          {offer.status === 'DECLINED' && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              Thư mời này đã được từ chối và không còn hiệu lực chấp nhận. Nếu HR phát hành Offer mới, vui lòng dùng liên kết trong email mới nhất.
            </p>
          )}
          {offer.status === 'EXPIRED' && (
            <p className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
              Thư mời này đã hết hạn phản hồi. Vui lòng liên hệ bộ phận Nhân sự nếu cần phát hành lại Offer mới.
            </p>
          )}
          {offer.status === 'PENDING' && offer.sentAt && <>
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5"><button disabled={busy} className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setChoice('accept')}>Đồng ý nhận việc</button><button disabled={busy} className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setChoice('decline')}>Từ chối Offer</button></div>
            {choice && <Alert><p>Xác nhận {choice === 'accept' ? 'đồng ý nhận việc' : 'từ chối Offer'}? Phản hồi sẽ được gửi tới hệ thống Nhân sự.</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy} className={buttonClass} onClick={submit}>Xác nhận phản hồi</button><button disabled={busy} className={secondaryClass} onClick={() => setChoice(null)}>Quay lại</button></div></Alert>}
          </>}
        </>}
      </div>
    </div>
  </main>;
}
