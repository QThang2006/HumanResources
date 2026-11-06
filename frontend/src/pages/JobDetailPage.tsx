import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { recruitmentApi as api } from '../features/recruitment/api';
import type { Job } from '../features/recruitment/types';
import { errorText } from '../features/recruitment/ui';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  HeartHandshake,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  X,
  Award,
  Check,
} from 'lucide-react';

function JobDetail({ id }: { id: number }) {
  const [job, setJob] = useState<Job | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [receipt, setReceipt] = useState<{
    applicationId: number;
    message: string;
    warning: string | null;
  } | null>(null);

  const submission = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setJob(null);
    setError('');
    setLoading(true);
    setReceipt(null);
    setFile(null);
    setFileError('');
    setSubmitError('');
    setBusy(false);

    api
      .job(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setJob(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      submission.current?.abort();
    };
  }, [id, attempt]);

  function chooseFile(next?: File) {
    setFile(null);
    setFileError('');
    if (!next) return;
    if (
      !/\.(pdf|png|jpe?g|webp)$/i.test(next.name) ||
      !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(next.type) ||
      !next.size ||
      next.size > 5 * 1024 * 1024
    ) {
      setFileError('Vui lòng chọn file PDF, PNG, JPG hoặc WEBP có dung lượng từ 1 byte đến tối đa 5 MiB.');
      return;
    }
    setFile(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !job || busy) return;

    const form = new FormData(event.currentTarget);
    form.set('jobId', String(job.id));
    form.set('cv', file);

    const controller = new AbortController();
    submission.current = controller;
    setBusy(true);
    setSubmitError('');

    try {
      const result = await api.apply(form, controller.signal);
      if (!controller.signal.aborted) setReceipt(result);
    } catch (e) {
      if (!controller.signal.aborted) setSubmitError(errorText(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  }

  function scrollToApplyForm() {
    const el = document.getElementById('apply-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ──────────────── TOP NAVIGATION / BREADCRUMB BAR ──────────────── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/careers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Tất cả việc làm
            </Link>

            {job && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <span>/</span>
                <span className="text-slate-600 font-medium">{job.departmentName}</span>
                <span>/</span>
                <span className="text-slate-800 font-semibold truncate max-w-xs">{job.title}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            >
              {copiedToast ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã sao chép link!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Chia sẻ</span>
                </>
              )}
            </button>

            {job && !receipt && (
              <button
                type="button"
                onClick={scrollToApplyForm}
                className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-all"
              >
                Ứng tuyển ngay
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ──────────────── MAIN CONTENT ──────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* LOADING STATE */}
        {loading && (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Đang tải thông tin chi tiết vị trí tuyển dụng...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div
            role="alert"
            className="my-8 rounded-2xl border border-rose-200 bg-rose-50/80 p-8 text-center max-w-xl mx-auto shadow-xs"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-rose-900 mb-1">Không thể tải thông tin vị trí</h3>
            <p className="text-sm text-rose-700 leading-relaxed mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAttempt((v) => v + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
              >
                Thử tải lại
              </button>
              <Link
                to="/careers"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Quay lại danh sách
              </Link>
            </div>
          </div>
        )}

        {/* READY JOB DETAIL */}
        {!loading && !error && job && (
          <div className="space-y-8">
            {/* ── JOB HERO CARD ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-lg">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.departmentName}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Đang mở tuyển dụng
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {job.title}
              </h1>

              {/* Job Key Highlights Strip */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Địa điểm làm việc</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{job.location || 'Hà Nội'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Mức thu nhập</p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {job.salaryRange || 'Lương thỏa thuận'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Hình thức</p>
                    <p className="text-sm font-bold text-slate-900 truncate">Toàn thời gian</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Quy trình tuyển</p>
                    <p className="text-sm font-bold text-slate-900 truncate">Phản hồi 24-48h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2-COLUMN MAIN CONTENT (LEFT: JD, RIGHT: FORM) ── */}
            <div className="grid items-start gap-8 lg:grid-cols-[1.35fr_1fr]">
              {/* LEFT COLUMN: JOB OVERVIEW & DETAILS */}
              <div className="space-y-6">
                {/* 1. MÔ TẢ CÔNG VIỆC */}
                <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Mô Tả Công Việc Chi Tiết</h2>
                  </div>
                  <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-slate-700 break-words">
                    {job.description}
                  </div>
                </article>

                {/* 2. YÊU CẦU ỨNG VIÊN */}
                <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Award className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Yêu Cầu Năng Lực & Kinh Nghiệm</h2>
                  </div>
                  <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-slate-700 break-words">
                    {job.requirements}
                  </div>
                </article>

                {/* 3. CHẾ ĐỘ PHÚC LỢI & ĐÃI NGỘ */}
                <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Quyền Lợi & Môi Trường Làm Việc</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1.5">
                        <DollarSign className="h-4 w-4" />
                        <span>Đãi Ngộ & Thưởng Dự Án</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Lương cạnh tranh, thưởng tháng 13+, thưởng hiệu quả dự án và xét điều chỉnh lương 2 lần/năm.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1.5">
                        <HeartHandshake className="h-4 w-4" />
                        <span>Bảo Hiểm Toàn Diện</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Đóng 100% BHXH theo lương thực tế, bảo hiểm sức khỏe VIP cho cá nhân và khám định kỳ hằng năm.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-amber-600 font-bold text-sm mb-1.5">
                        <Laptop className="h-4 w-4" />
                        <span>Thiết Bị & Văn Phòng Hiện Đại</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Cấp phát laptop cấu hình cao, văn phòng mở tiện nghi, quầy pantry đồ ăn nhẹ miễn phí.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>Onboarding & Mentor 1-on-1</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Lộ trình thử việc 30 ngày bài bản, có Mentor chuyên trách kèm cặp và AI Copilot hỗ trợ tra cứu nội bộ 24/7.
                      </p>
                    </div>
                  </div>
                </article>

                {/* 4. QUY TRÌNH TUYỂN DỤNG VỊ TRÍ NÀY */}
                <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Các Bước Tuyển Dụng Vị Trí Này</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs mb-1.5">
                        1
                      </span>
                      <p className="text-xs font-bold text-slate-900">Gửi CV Online</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Thời gian: 2 phút</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs mb-1.5">
                        2
                      </span>
                      <p className="text-xs font-bold text-slate-900">Sơ loại Hồ Sơ</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Trong 24-48 giờ</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs mb-1.5">
                        3
                      </span>
                      <p className="text-xs font-bold text-slate-900">Phỏng Vấn Team</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Trực tiếp / Online</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs mb-1.5">
                        4
                      </span>
                      <p className="text-xs font-bold text-slate-900">Nhận Offer</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Chào đón gia nhập</p>
                    </div>
                  </div>
                </article>
              </div>

              {/* RIGHT COLUMN: APPLICATION FORM (STICKY) */}
              <div id="apply-form-section" className="lg:sticky lg:top-20 space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
                  {/* SUCCESS RECEIPT STATE */}
                  {receipt ? (
                    <div className="space-y-5 text-center py-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 mb-2">
                          Mã hồ sơ: #{receipt.applicationId}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900">Hồ Sơ Đã Được Gửi Thành Công!</h2>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                          {receipt.message || 'Cảm ơn bạn đã quan tâm. Hồ sơ của bạn đã được chuyển tới bộ phận tuyển dụng.'}
                        </p>
                      </div>

                      {receipt.warning && (
                        <div
                          role="status"
                          className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 text-left"
                        >
                          {receipt.warning}
                        </div>
                      )}

                      {/* Next steps card */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2 text-xs text-slate-600">
                        <p className="font-bold text-slate-900 text-sm">Bước tiếp theo:</p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Hệ thống đã gửi xác nhận tiếp nhận tới email của bạn.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Đội ngũ tuyển dụng sẽ xem xét và phản hồi kết quả trong 24-48 giờ làm việc.</span>
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <Link
                          to="/careers"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
                        >
                          Khám phá các vị trí khác <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* FORM INPUT STATE */
                    <form key={id} onSubmit={submit} className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                          <h2 className="text-xl font-bold text-slate-900">Ứng Tuyển Vị Trí Này</h2>
                        </div>
                        <p className="text-xs text-slate-500">
                          Điền thông tin và tải lên CV để hoàn tất ứng tuyển nhanh trong 2 phút.
                        </p>
                      </div>

                      {/* AI Screening Notice */}
                      <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 border border-blue-100 p-2.5 text-xs text-blue-700 font-medium">
                        <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>Hệ thống AI tự động phân tích hồ sơ & phản hồi trong 24-48h</span>
                      </div>

                      {/* Candidate Name */}
                      <div>
                        <label htmlFor="candidate-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Họ và tên <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <User className="h-4 w-4" />
                          </div>
                          <input
                            id="candidate-name"
                            name="candidateName"
                            type="text"
                            autoComplete="name"
                            required
                            maxLength={150}
                            placeholder="Nguyễn Văn A"
                            disabled={busy}
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
                          />
                        </div>
                      </div>

                      {/* Candidate Email */}
                      <div>
                        <label htmlFor="candidate-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Địa chỉ Email <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Mail className="h-4 w-4" />
                          </div>
                          <input
                            id="candidate-email"
                            name="candidateEmail"
                            type="email"
                            autoComplete="email"
                            required
                            maxLength={255}
                            placeholder="email@example.com"
                            disabled={busy}
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
                          />
                        </div>
                      </div>

                      {/* Candidate Phone */}
                      <div>
                        <label htmlFor="candidate-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Số điện thoại <span className="text-slate-400 font-normal lowercase">(không bắt buộc)</span>
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Phone className="h-4 w-4" />
                          </div>
                          <input
                            id="candidate-phone"
                            name="candidatePhone"
                            type="tel"
                            autoComplete="tel"
                            maxLength={20}
                            placeholder="0912 345 678"
                            disabled={busy}
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
                          />
                        </div>
                      </div>

                      {/* CV Upload Dropzone */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Hồ sơ đính kèm (CV) <span className="text-rose-500">*</span>
                        </label>

                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                          }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            if (!busy) chooseFile(e.dataTransfer.files[0]);
                          }}
                          className={`relative rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                            isDragOver
                              ? 'border-blue-600 bg-blue-50/80 scale-[1.01]'
                              : file
                              ? 'border-emerald-300 bg-emerald-50/30'
                              : 'border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            ref={fileInput}
                            id="cv-file"
                            aria-describedby="cv-help"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                            disabled={busy}
                            onChange={(e) => chooseFile(e.target.files?.[0])}
                            className="sr-only"
                          />

                          {file ? (
                            /* Selected File Preview */
                            <div className="flex items-center justify-between gap-3 text-left">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    {Math.ceil(file.size / 1024)} KB · Sẵn sàng gửi
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  chooseFile();
                                  if (fileInput.current) fileInput.current.value = '';
                                }}
                                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                aria-label="Xóa file đã chọn"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            /* Dropzone Prompt */
                            <label
                              htmlFor="cv-file"
                              className="cursor-pointer flex flex-col items-center justify-center py-2"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-2">
                                <UploadCloud className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-bold text-slate-800">
                                Kéo thả hoặc <span className="text-blue-600 underline">bấm để chọn file CV</span>
                              </p>
                              <p id="cv-help" className="mt-1 text-[11px] text-slate-500">
                                Hỗ trợ PDF, PNG, JPG hoặc WEBP (Tối đa 5 MiB)
                              </p>
                            </label>
                          )}
                        </div>

                        {fileError && (
                          <div role="alert" className="mt-2 text-xs font-medium text-rose-600 flex items-center gap-1.5">
                            <X className="h-3.5 w-3.5 shrink-0" />
                            <span>{fileError}</span>
                          </div>
                        )}
                      </div>

                      {/* Error Alert */}
                      {submitError && (
                        <div
                          role="alert"
                          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                        >
                          {submitError}
                        </div>
                      )}

                      {/* Security & Privacy Note */}
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Bằng việc gửi hồ sơ, bạn đồng ý cho phép ban tuyển dụng xử lý thông tin cá nhân theo đúng mục đích tuyển dụng.
                      </p>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={busy || !file}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                      >
                        {busy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Đang gửi hồ sơ & xử lý...</span>
                          </>
                        ) : (
                          <>
                            <span>Gửi Hồ Sơ Ứng Tuyển</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function JobDetailPage() {
  const { id } = useParams();

  if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Mã vị trí tuyển dụng không hợp lệ</h1>
        <p className="text-sm text-slate-600">Đường dẫn không tồn tại hoặc đã hết hạn tuyển dụng.</p>
        <Link
          to="/careers"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại Cổng việc làm
        </Link>
      </main>
    );
  }

  return <JobDetail key={id} id={Number(id)} />;
}
