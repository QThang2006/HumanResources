import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { offerLabels, type OfferView } from '../features/recruitment/OfferPanel';
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
    return <main className="mx-auto max-w-2xl space-y-5 p-6">
    <h1 className="text-2xl font-bold">Thư mời nhận việc</h1>
    {error && <Alert>{error}</Alert>}
    {offer && <>
      <p>Kính gửi <strong>{offer.candidateName}</strong>,</p>
      <p>Vị trí: <strong>{offer.jobTitle}</strong></p><p>Mức lương: {offer.salary}</p><p>Ngày nhận việc: {offer.startDate}</p>
      <p>Trạng thái: <strong>{offerLabels[offer.status]}</strong></p>
      {offer.sentAt ? <p>Hạn phản hồi: {new Date(offer.expiresAt).toLocaleString('vi-VN')}</p> : <p>Thư đang được xử lý. Vui lòng tải lại sau ít phút.</p>}
      {offer.status === 'PENDING' && offer.sentAt && <>
        <div className="flex gap-3"><button disabled={busy} className={buttonClass} onClick={() => setChoice('accept')}>Đồng ý nhận việc</button><button disabled={busy} className={secondaryClass} onClick={() => setChoice('decline')}>Từ chối Offer</button></div>
        {choice && <Alert><p>Xác nhận {choice === 'accept' ? 'đồng ý nhận việc' : 'từ chối Offer'}? Phản hồi sẽ được gửi tới hệ thống Nhân sự.</p><div className="mt-3 flex gap-3"><button disabled={busy} className={buttonClass} onClick={submit}>Xác nhận phản hồi</button><button disabled={busy} className={secondaryClass} onClick={() => setChoice(null)}>Quay lại</button></div></Alert>}
      </>}
    </>}
  </main>;
}
