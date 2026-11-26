import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileSearch,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { recruitmentApi as api } from '../features/recruitment/api';
import type { PublicApplicationTracking } from '../features/recruitment/types';
import { errorText } from '../features/recruitment/ui';
import {
  TRACKING_STEPS,
  formatTrackingDateTime,
  getTrackingStatusMeta,
  isValidTrackingCode,
  normalizeTrackingCode,
} from '../features/recruitment/tracking-helpers';

export function ApplicationTrackingPage() {
  const { code: routeCode } = useParams();
  const normalizedRouteCode = normalizeTrackingCode(routeCode || '');
  return <ApplicationTrackingView key={normalizedRouteCode} normalizedRouteCode={normalizedRouteCode} />;
}

function ApplicationTrackingView({ normalizedRouteCode }: { normalizedRouteCode: string }) {
  const navigate = useNavigate();
  const routeCodeValid = Boolean(normalizedRouteCode) && isValidTrackingCode(normalizedRouteCode);

  const [inputCode, setInputCode] = useState(normalizedRouteCode);
  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(routeCodeValid);
  const [fetchError, setFetchError] = useState(
    normalizedRouteCode && !routeCodeValid
      ? 'Mã tra cứu không đúng định dạng. Vui lòng kiểm tra lại mã (ví dụ: APP-A1B2C3D4E5F6) trong email xác nhận.'
      : '',
  );
  const [data, setData] = useState<PublicApplicationTracking | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!routeCodeValid) return;

    const controller = new AbortController();
    api
      .trackApplication(normalizedRouteCode, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setFetchError('');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setData(null);
          setFetchError(errorText(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [normalizedRouteCode, routeCodeValid, attempt]);

  function retryLookup() {
    if (!routeCodeValid) return;
    setLoading(true);
    setFetchError('');
    setData(null);
    setAttempt((value) => value + 1);
  }

  function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeTrackingCode(inputCode);
    if (!normalized) {
      setInputError('Vui lòng nhập mã tra cứu hồ sơ.');
      return;
    }
    if (!isValidTrackingCode(normalized)) {
      setInputError('Mã tra cứu chỉ gồm chữ cái, chữ số và dấu gạch ngang (6–32 ký tự).');
      return;
    }
    setInputError('');
    if (normalized === normalizedRouteCode) {
      retryLookup();
      return;
    }
    navigate('/track/' + encodeURIComponent(normalized));
  }

  const statusMeta = data ? getTrackingStatusMeta(data.status) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-800">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Cổng việc làm
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            Tra cứu bảo mật — không cần đăng nhập
          </span>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <header className="border-b border-slate-200 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileSearch className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Tra cứu trạng thái hồ sơ ứng tuyển
                </h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  Nhập mã tra cứu được cấp sau khi nộp CV hoặc trong email xác nhận của bạn.
                </p>
              </div>
            </div>
          </header>

          <form onSubmit={handleLookup} className="mt-6">
            <label
              htmlFor="tracking-code-input"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Mã tra cứu hồ sơ
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="tracking-code-input"
                  type="text"
                  maxLength={32}
                  value={inputCode}
                  onChange={(event) => {
                    setInputCode(event.target.value);
                    if (inputError) setInputError('');
                  }}
                  placeholder="Ví dụ: APP-A1B2C3D4E5F6"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 font-mono text-sm uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tra cứu...
                  </>
                ) : (
                  'Tra cứu hồ sơ'
                )}
              </button>
            </div>
            {inputError && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                {inputError}
              </p>
            )}
          </form>

          {loading && (
            <div role="status" className="mt-8 flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Đang kiểm tra trạng thái hồ sơ...
              </p>
            </div>
          )}

          {!loading && fetchError && (
            <div
              role="alert"
              className="mt-8 rounded-xl border border-rose-200 bg-rose-50/80 p-5 text-sm text-rose-900"
            >
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="space-y-2">
                  <p className="font-semibold">Không tìm thấy thông tin hồ sơ</p>
                  <p className="text-rose-800">{fetchError}</p>
                  <p className="text-xs text-rose-700">
                    Vui lòng kiểm tra lại mã tra cứu trong thông báo sau khi nộp CV hoặc email xác nhận.
                  </p>
                  <button
                    type="button"
                    onClick={retryLookup}
                    className="mt-1 inline-flex items-center rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Thử tra cứu lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !fetchError && !data && !normalizedRouteCode && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Nhập mã tra cứu hồ sơ ở ô phía trên để xem tiến trình tuyển dụng hiện tại.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Để bảo vệ quyền riêng tư, trang tra cứu chỉ hiển thị tiến độ hồ sơ và không hiển thị điểm đánh giá hay ghi chú nội bộ.
              </p>
            </div>
          )}

          {!loading && !fetchError && data && statusMeta && (
            <div className="mt-8 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                      {data.trackingCode}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">{data.jobTitle}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                      {data.departmentName && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {data.departmentName}
                        </span>
                      )}
                      {data.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {data.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-200/80 pt-4">
                  <p className="text-sm text-slate-700">
                    Kính gửi <strong className="text-slate-900">{data.candidateName}</strong>,
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{statusMeta.headline}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {statusMeta.description}
                  </p>
                </div>
              </div>

              {statusMeta.isRejected ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5">
                  <h3 className="text-sm font-bold text-rose-900">Trạng thái quy trình tuyển dụng</h3>
                  <p className="mt-1 text-sm leading-relaxed text-rose-800">
                    Hồ sơ cho vị trí <strong>{data.jobTitle}</strong> đã được khép lại. Bạn có thể
                    tham khảo thêm các vị trí khác đang mở tuyển tại trang Cổng việc làm.
                  </p>
                  <div className="mt-4">
                    <Link
                      to="/careers"
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      Khám phá vị trí khác đang tuyển
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 text-sm font-bold text-slate-900">Tiến trình hồ sơ</h3>
                  <ol className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    {TRACKING_STEPS.map((step, index) => {
                      const completed = index < statusMeta.activeStepIndex;
                      const current = index === statusMeta.activeStepIndex;
                      return (
                        <li
                          key={step.key}
                          className={`rounded-xl border p-3.5 transition-colors ${
                            current
                              ? 'border-blue-300 bg-blue-50/70'
                              : completed
                                ? 'border-emerald-200 bg-emerald-50/50'
                                : 'border-slate-200 bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                completed
                                  ? 'bg-emerald-600 text-white'
                                  : current
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                current
                                  ? 'text-blue-800'
                                  : completed
                                    ? 'text-emerald-800'
                                    : 'text-slate-600'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            {step.shortDescription}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {data.upcomingInterview && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Lịch phỏng vấn sắp tới — Vòng {data.upcomingInterview.round}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-blue-800">
                        Thời gian (giờ Việt Nam):{' '}
                        {formatTrackingDateTime(data.upcomingInterview.scheduledAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Đường dẫn Google Meet và hướng dẫn chi tiết đã được gửi qua email mời phỏng vấn của bạn.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Ngày nộp hồ sơ</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatTrackingDateTime(data.submittedAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Cập nhật lần cuối</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatTrackingDateTime(data.updatedAt)}
                    </dd>
                  </div>
                </div>
              </dl>

              <p className="text-xs text-slate-500">
                Thông tin đánh giá nội bộ, điểm sàng lọc và tài liệu CV đính kèm không được hiển thị công khai trên trang này nhằm bảo mật dữ liệu ứng viên.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
