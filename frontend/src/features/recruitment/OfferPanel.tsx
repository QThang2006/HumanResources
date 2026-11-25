import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  canIssueNewOffer,
  nextOfferVersion,
  offerDeliveryLabels,
  offerLabels,
  resolveOfferVersion,
  todayOfferInputDate,
  type OfferView,
} from './offer-helpers';
import { Alert, buttonClass, errorText, Field, inputClass, secondaryClass } from './ui';

function statusBadgeClass(status: string): string {
  if (status === 'ACCEPTED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'DECLINED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'EXPIRED') return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

export function OfferPanel({
  applicationId,
  jobTitle,
  canCreate,
  changed,
  statusChanged,
}: {
  applicationId: number;
  jobTitle: string;
  canCreate: boolean;
  changed: () => void;
  statusChanged: (status: string | null) => void;
}) {
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [salary, setSalary] = useState('');
  const [startDate, setDate] = useState('');
  const [roleTitle, setTitle] = useState(jobTitle);
  const [minStartDate] = useState(() => todayOfferInputDate());

  const applyRows = useCallback(
    (rows: OfferView[]) => {
      setOffers(rows);
      setLoaded(true);
      const latest = rows[0] || null;
      statusChanged(latest?.status || null);
      if (latest && ['DECLINED', 'EXPIRED'].includes(latest.status)) {
        setTitle((current) => current || latest.jobTitle || jobTitle);
      }
    },
    [jobTitle, statusChanged],
  );

  const refresh = useCallback(async () => {
    const rows = await apiClient.get<unknown, OfferView[]>(`/applications/${applicationId}/offers`);
    applyRows(rows);
  }, [applicationId, applyRows]);

  useEffect(() => {
    let active = true;
    apiClient
      .get<unknown, OfferView[]>(`/applications/${applicationId}/offers`)
      .then((rows) => {
        if (active) applyRows(rows);
      })
      .catch((e) => {
        if (active) {
          setLoaded(true);
          setError(errorText(e));
        }
      });
    return () => {
      active = false;
    };
  }, [applicationId, applyRows]);

  async function action(fn: () => Promise<string | void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const message = await fn();
      await refresh();
      changed();
      if (message) setNotice(message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const latestOffer = offers[0] || null;
  const latestVersion = latestOffer ? resolveOfferVersion(latestOffer, 0, offers.length) : 0;
  const allowNewOffer = loaded && canIssueNewOffer(latestOffer, canCreate);
  const upcomingVersion = nextOfferVersion(offers);
  const isReissue = Boolean(latestOffer) && allowNewOffer;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Offer Letter</h3>
          {latestOffer && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Mới nhất: v{latestVersion}
            </span>
          )}
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          Thời hạn 48 giờ
        </span>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert success>{notice}</Alert>}
      {!loaded && (
        <p role="status" className="text-sm text-slate-500">
          Đang tải Offer...
        </p>
      )}

      {latestOffer && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
              v{latestVersion}
            </span>
            <span
              className={
                'rounded-full border px-2.5 py-1 font-semibold ' +
                statusBadgeClass(latestOffer.status)
              }
            >
              {offerLabels[latestOffer.status] || latestOffer.status}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
              {offerDeliveryLabels[latestOffer.deliveryStatus] || latestOffer.deliveryStatus}
            </span>
          </div>

          <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-slate-500">Vị trí nhận việc</dt>
              <dd className="mt-1 break-words font-semibold text-slate-900">
                {latestOffer.jobTitle}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-slate-500">Mức lương</dt>
              <dd className="mt-1 break-words font-semibold text-emerald-700">
                {latestOffer.salary}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Ngày nhận việc</dt>
              <dd className="mt-1 font-medium text-slate-700">{latestOffer.startDate}</dd>
            </div>
            {latestOffer.respondedAt && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Thời điểm phản hồi</dt>
                <dd className="mt-1 font-medium text-slate-700">
                  {new Date(latestOffer.respondedAt).toLocaleString('vi-VN')}
                </dd>
              </div>
            )}
          </dl>

          {latestOffer.sentAt && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              Hạn phản hồi: {new Date(latestOffer.expiresAt).toLocaleString('vi-VN')}
            </p>
          )}
          {latestOffer.remindedAt && (
            <p className="text-sm text-slate-600">Đã gửi nhắc nhở 24 giờ và báo HR.</p>
          )}
          {latestOffer.status === 'PENDING' &&
            ['PENDING', 'DISPATCH_FAILED'].includes(latestOffer.deliveryStatus) && (
              <button
                disabled={busy}
                className={secondaryClass}
                onClick={() =>
                  action(async () => {
                    await apiClient.post(`/applications/${applicationId}/offer/retry`);
                    return `Đã gửi lại yêu cầu phát hành Offer v${latestVersion} qua workflow.`;
                  })
                }
              >
                Thử gửi lại qua workflow
              </button>
            )}
        </div>
      )}

      {allowNewOffer ? (
        <form
          className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const issuedVersion = upcomingVersion;
            action(async () => {
              await apiClient.post(`/applications/${applicationId}/offer`, {
                roleTitle,
                salary,
                startDate,
              });
              setSalary('');
              setDate('');
              return `Đã phát hành Offer v${issuedVersion} và gửi thư mời tới ứng viên.`;
            });
          }}
        >
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              {isReissue
                ? `Phát hành lại Offer v${upcomingVersion}`
                : `Phát hành Offer v${upcomingVersion}`}
            </h4>
            {isReissue && latestOffer && (
              <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                Offer v{latestVersion}{' '}
                {latestOffer.status === 'DECLINED'
                  ? 'đã bị ứng viên từ chối'
                  : 'đã hết hạn phản hồi'}
                . Bạn có thể thương lượng lại lương/ngày nhận việc và gửi Offer v{upcomingVersion}{' '}
                mới (liên kết cũ không còn chấp nhận được).
              </p>
            )}
          </div>
          <Field label="Vị trí nhận việc">
            <input
              required
              maxLength={200}
              className={inputClass}
              value={roleTitle}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Mức lương và đơn vị">
            <input
              required
              maxLength={100}
              placeholder="Ví dụ: 15.000.000 VND/tháng (gross)"
              className={inputClass}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </Field>
          <Field label="Ngày nhận việc">
            <input
              required
              type="date"
              min={minStartDate}
              className={inputClass}
              value={startDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <p className="text-sm leading-relaxed text-slate-600">
            Phát hành sẽ gửi thư tới ứng viên. Sau 24 giờ chưa phản hồi, hệ thống nhắc ứng viên và
            HR; sau 48 giờ Offer hết hạn.
          </p>
          <button disabled={busy} className={buttonClass}>
            {busy
              ? 'Đang phát hành...'
              : isReissue
                ? `Phát hành và gửi Offer v${upcomingVersion}`
                : 'Phát hành và gửi Offer'}
          </button>
        </form>
      ) : (
        loaded &&
        !latestOffer && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Chỉ phát hành sau khi vòng phỏng vấn mới nhất đạt.
          </p>
        )
      )}

      {offers.length > 1 && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Lịch sử các phiên bản Offer ({offers.length})
          </h4>
          <ul className="space-y-2.5">
            {offers.map((item, index) => {
              const version = resolveOfferVersion(item, index, offers.length);
              const isLatest = index === 0;
              return (
                <li
                  key={item.offerId}
                  className={
                    'rounded-xl border p-3.5 text-sm ' +
                    (isLatest
                      ? 'border-blue-200 bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50')
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-blue-200 bg-white px-2 py-0.5 text-xs font-bold text-blue-700">
                        v{version}
                      </span>
                      <span
                        className={
                          'rounded-full border px-2 py-0.5 text-xs font-semibold ' +
                          statusBadgeClass(item.status)
                        }
                      >
                        {offerLabels[item.status] || item.status}
                      </span>
                      {isLatest ? (
                        <span className="text-xs font-semibold text-blue-700">Phiên bản hiện tại</span>
                      ) : (
                        <span className="text-xs text-slate-500">Liên kết đã hết hiệu lực</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">{item.salary}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    {item.jobTitle} · Nhận việc: {item.startDate}
                    {item.respondedAt
                      ? ' · Phản hồi: ' + new Date(item.respondedAt).toLocaleString('vi-VN')
                      : item.sentAt
                        ? ' · Hạn: ' + new Date(item.expiresAt).toLocaleString('vi-VN')
                        : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <button disabled={busy} className={secondaryClass} onClick={() => action(refresh)}>
          Cập nhật trạng thái Offer
        </button>
      </div>
    </section>
  );
}
