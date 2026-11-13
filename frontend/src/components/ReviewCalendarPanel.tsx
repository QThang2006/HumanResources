import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Award, CalendarDays, Check, Loader2, RefreshCw, Save, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reviewCalendarApi, type ReviewCalendarBoard, type ReviewCalendarEmployee, type ReviewCalendarUpdate, type ReviewDelivery } from '../api/review-calendar.api';
import { TrainingToast } from './TrainingToast';
import './review-calendar.css';
import './user-management.css';

function currentPeriod() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
}
const dateLabel = (date?: string | null) => date ? date.slice(0, 10).split('-').reverse().join('/') : 'Chưa có';
const draftFrom = (board: ReviewCalendarBoard): ReviewCalendarUpdate => ({ openingDate: board.calendar.openingDate, reminderDate: board.calendar.reminderDate, deadline: board.calendar.deadline, version: board.calendar.version });
function DeliveryBadge({ delivery }: { delivery: ReviewDelivery | null }) {
  if (!delivery) return <span className="tv4-review-muted">Chưa gửi</span>;
  const label = { SENT: 'Đã gửi', PARTIAL: 'Gửi một phần', FAILED: 'Gửi lỗi' }[delivery.status];
  return <details className="tv4-review-delivery"><summary className={`tv4-review-status is-${delivery.status.toLowerCase()}`}>{label}</summary><div><p>Email: {delivery.emailNotified ? 'Đã gửi' : 'Chưa xác nhận gửi'}</p><p>Telegram: {delivery.telegramNotified ? 'Đã gửi' : 'Chưa xác nhận gửi'}</p><p>{delivery.sentAt ? new Date(delivery.sentAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận thời gian gửi'}</p></div></details>;
}
export function ReviewCalendarPanel() {
  const { user } = useAuth();
  const canEdit = user?.role === 'SUPERADMIN';
  const allowed = canEdit || user?.role === 'HR' || user?.role === 'MANAGER';
  const [period, setPeriod] = useState(currentPeriod);
  const [board, setBoard] = useState<ReviewCalendarBoard | null>(null);
  const [draft, setDraft] = useState<ReviewCalendarUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [confirming, setConfirming] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState('');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  // Modal chấm điểm KPI
  const [reviewingEmployee, setReviewingEmployee] = useState<ReviewCalendarEmployee | null>(null);
  const [kpiScore, setKpiScore] = useState<number>(85);
  const [ratingRank, setRatingRank] = useState<'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR'>('GOOD');
  const [managerComment, setManagerComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const saveSequence = useRef(0);
  const closeToast = useCallback(() => setToast(null), []);
  const dirty = Boolean(board && draft && JSON.stringify(draft) !== JSON.stringify(draftFrom(board)));
  const request = useRef(0);

  useEffect(() => {
    if (!allowed) return;
    const abort = new AbortController();
    const sequence = ++request.current;
    const timer = window.setTimeout(() => {
      setLoading(true); setError(''); setBoard(null); setDraft(null); setConfirming(false); setFormError('');
      reviewCalendarApi.get(period, abort.signal).then(value => {
        if (abort.signal.aborted || sequence !== request.current) return;
        setBoard(value); setDraft(draftFrom(value));
      }).catch(cause => {
        if (!abort.signal.aborted && sequence === request.current) setError(cause instanceof Error ? cause.message : 'Không thể tải kỳ đánh giá.');
      }).finally(() => { if (!abort.signal.aborted && sequence === request.current) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [period, refresh, allowed]);

  if (!allowed) return null;
  const employees = (board?.employees || []).filter(employee => {
    const matchesState = filter === 'ALL' || (filter === 'SUBMITTED' ? employee.submitted : !employee.submitted);
    const text = `${employee.fullName} ${employee.email} ${employee.departmentName || ''}`.toLocaleLowerCase('vi');
    return matchesState && text.includes(query.trim().toLocaleLowerCase('vi'));
  });
  const validate = () => {
    if (!draft) return false;
    if (![draft.openingDate, draft.reminderDate, draft.deadline].every(date => date && date.slice(0, 7) === period)) { setFormError('Cả ba ngày phải nằm trong kỳ đang chọn.'); return false; }
    if (!(draft.openingDate < draft.reminderDate && draft.reminderDate <= draft.deadline)) { setFormError('Ngày mở kỳ phải trước ngày nhắc lần hai; hạn hoàn thành không được trước ngày nhắc.'); return false; }
    setFormError(''); return true;
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (canEdit && dirty && !saving && validate()) setConfirming(true); };
  const save = async () => {
    if (!canEdit || !draft || saving || !validate()) return;
    setSaving(true); setFormError('');
    try {
      const calendar = await reviewCalendarApi.update(period, draft);
      setBoard(current => current ? { ...current, calendar } : current);
      setDraft({ openingDate: calendar.openingDate, reminderDate: calendar.reminderDate, deadline: calendar.deadline, version: calendar.version });
      setConfirming(false);
      setToast({ id: ++saveSequence.current, message: `Đã lưu lịch đánh giá tháng ${period.slice(5)}/${period.slice(0, 4)}.` });
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Không thể lưu lịch.'); }
    finally { setSaving(false); }
  };
  const selectPeriod = (value: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value === period) return;
    if (dirty) setPendingPeriod(value); else setPeriod(value);
  };

  const openReviewModal = (employee: ReviewCalendarEmployee) => {
    setReviewingEmployee(employee);
    if (employee.review) {
      setKpiScore(employee.review.kpiScore);
      setRatingRank(employee.review.ratingRank as any);
      setManagerComment(employee.review.managerComment || '');
    } else {
      setKpiScore(85);
      setRatingRank('GOOD');
      setManagerComment('Hoàn thành tốt các mục tiêu công việc trong kỳ.');
    }
    setReviewError('');
  };

  const handleScoreChange = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    setKpiScore(clamped);
    if (clamped >= 90) setRatingRank('EXCELLENT');
    else if (clamped >= 70) setRatingRank('GOOD');
    else if (clamped >= 50) setRatingRank('AVERAGE');
    else setRatingRank('POOR');
  };

  const handleSaveReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewingEmployee) return;
    setSubmittingReview(true);
    setReviewError('');
    try {
      const result = await reviewCalendarApi.submitReview({
        userId: reviewingEmployee.id,
        reviewPeriod: period,
        kpiScore,
        ratingRank,
        managerComment,
      });
      setBoard(current => {
        if (!current) return current;
        const updatedEmployees = current.employees.map(emp => {
          if (emp.id === reviewingEmployee.id) {
            return {
              ...emp,
              submitted: true,
              review: {
                id: result.review?.id || Date.now(),
                kpiScore,
                ratingRank,
                managerComment,
                submittedAt: new Date().toISOString(),
              },
            };
          }
          return emp;
        });
        const newlySubmitted = !reviewingEmployee.submitted;
        return {
          ...current,
          submittedCount: newlySubmitted ? current.submittedCount + 1 : current.submittedCount,
          employees: updatedEmployees,
        };
      });
      setToast({ id: ++saveSequence.current, message: `Đã lưu đánh giá KPI cho ${reviewingEmployee.fullName}!` });
      setReviewingEmployee(null);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Không thể lưu đánh giá.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return <section className="tv4-review-calendar" aria-labelledby="tv4-review-title">
    {toast && <TrainingToast key={toast.id} message={toast.message} success onClose={closeToast} />}
    <header className="tv4-review-heading"><div><h3 id="tv4-review-title">Đánh giá định kỳ</h3></div><div className="tv4-review-period"><label htmlFor="tv4-review-period">Kỳ đánh giá</label><input id="tv4-review-period" type="month" min="2000-01" max="2100-12" value={period} disabled={saving} onChange={event => selectPeriod(event.target.value)} /><button type="button" className="tv4-user-button" disabled={loading || saving || dirty} title={dirty ? 'Lưu hoặc hủy thay đổi trước khi tải lại' : undefined} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Làm mới</button></div></header>
    {pendingPeriod && <div className="tv4-review-confirm" role="alert"><p>Có lịch chưa lưu. Bỏ thay đổi để chuyển kỳ đánh giá?</p><button type="button" className="tv4-user-button" onClick={() => setPendingPeriod('')}>Giữ kỳ hiện tại</button><button type="button" className="tv4-user-button is-primary" onClick={() => { setPeriod(pendingPeriod); setPendingPeriod(''); }}>Bỏ thay đổi và chuyển kỳ</button></div>}
    {loading ? <div className="tv4-review-loading" role="status"><span /><span /><span /><p>Đang tải kỳ đánh giá…</p></div> : error ? <div className="tv4-review-error" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><p>{error}</p><button type="button" className="tv4-user-button" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div></div> : board && draft && <>
      <form className="tv4-review-schedule" onSubmit={submit} aria-busy={saving}>
        <div className="tv4-review-schedule-title"><h4><CalendarDays size={18} aria-hidden="true" />Lịch nhắc đánh giá</h4><span>{board.calendar.configured ? 'Đã cấu hình' : 'Lịch mặc định'}</span></div>
        <div className="tv4-review-dates">{([['openingDate','Thông báo mở kỳ'],['reminderDate','Nhắc lần hai'],['deadline','Hạn hoàn thành']] as const).map(([key, label]) => <label key={key}>{label}{canEdit ? <input type="date" required disabled={saving} value={draft[key]} min={`${period}-01`} max={`${period}-${new Date(Number(period.slice(0,4)), Number(period.slice(5)), 0).getDate()}`} aria-invalid={Boolean(formError)} onChange={event => { setDraft(current => current ? { ...current, [key]: event.target.value } : current); setConfirming(false); setFormError(''); }} /> : <strong>{dateLabel(draft[key])}</strong>}</label>)}</div>
        {canEdit && <>{formError && <p className="tv4-review-error-text" role="alert">{formError}</p>}{confirming ? <div className="tv4-review-confirm" role="group" aria-label="Xác nhận lưu lịch"><p>Áp dụng lịch: mở kỳ {dateLabel(draft.openingDate)}, nhắc lại {dateLabel(draft.reminderDate)}, hạn {dateLabel(draft.deadline)}. Lịch này được dùng cho cả chạy tự động và Execute trong n8n.</p><button type="button" className="tv4-user-button" disabled={saving} onClick={() => setConfirming(false)}>Quay lại</button><button type="button" className="tv4-user-button is-primary" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{saving ? 'Đang lưu…' : 'Xác nhận lưu'}</button></div> : <div className="tv4-review-save"><span>{dirty ? 'Có thay đổi chưa lưu' : 'Lịch đang áp dụng'}</span>{dirty && <button type="button" className="tv4-user-button" onClick={() => { setDraft(draftFrom(board)); setFormError(''); }}>Hủy thay đổi</button>}<button type="submit" className="tv4-user-button is-primary" disabled={!dirty || saving}><Save size={16} aria-hidden="true" />Lưu lịch</button></div>}</>}
        {!canEdit && <p className="tv4-review-help">Chỉ Super Admin được thay đổi lịch nhắc.</p>}
      </form>
      <div className="tv4-review-roster"><div><h4>Tiến độ đánh giá</h4><p>{board.submittedCount}/{board.count} nhân viên đã được đánh giá trong kỳ.</p></div><div className="tv4-review-filters"><label className="tv4-review-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Tìm nhân viên</span><input type="search" placeholder="Tìm tên, email, phòng ban…" value={query} onChange={event => setQuery(event.target.value)} /></label><label><span className="sr-only">Tình trạng đánh giá</span><select value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">Tất cả tình trạng</option><option value="PENDING">Chưa đánh giá</option><option value="SUBMITTED">Đã đánh giá</option></select></label></div></div>
      <div className="tv4-review-table-wrap"><table><caption className="sr-only">Nhân viên và kết quả thông báo kỳ {period}</caption><thead><tr><th scope="col">Nhân viên</th><th scope="col">Phòng ban</th><th scope="col">Đánh giá</th><th scope="col">Thông báo mở kỳ</th><th scope="col">Nhắc lần hai</th><th scope="col" style={{ textAlign: 'right' }}>Thao tác</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td><strong>{employee.fullName}</strong><small>{employee.email}</small></td><td>{employee.departmentName || 'Chưa có phòng ban'}</td><td><span className={`tv4-review-status ${employee.submitted ? 'is-sent' : 'is-pending'}`}>{employee.submitted ? `Đã đánh giá (${employee.review?.kpiScore ?? '--'}/100)` : 'Chưa đánh giá'}</span></td><td><DeliveryBadge delivery={employee.openingDelivery} /></td><td><DeliveryBadge delivery={employee.followUpDelivery} /></td><td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><button type="button" className={`tv4-user-button ${employee.submitted ? '' : 'is-primary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }} onClick={() => openReviewModal(employee)}><Award size={14} aria-hidden="true" />{employee.submitted ? 'Sửa điểm' : 'Chấm điểm'}</button></td></tr>)}</tbody></table></div>
      {!employees.length && <div className="tv4-review-empty"><p>{board.count === 0 ? 'Chưa có nhân viên đang hoạt động để theo dõi.' : 'Không có nhân viên phù hợp bộ lọc.'}</p>{(query || filter !== 'ALL') && <button type="button" className="tv4-user-button" onClick={() => { setQuery(''); setFilter('ALL'); }}>Xóa bộ lọc</button>}</div>}
    </>}

    {/* MODAL CHẤM ĐIỂM KPI NHÂN VIÊN */}
    {reviewingEmployee && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {reviewingEmployee.submitted ? 'Cập Nhật Đánh Giá KPI' : 'Chấm Điểm Đánh Giá KPI'}
                </h3>
                <p className="text-xs text-slate-500">Kỳ đánh giá: Tháng {period.slice(5)}/{period.slice(0, 4)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReviewingEmployee(null)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveReview} className="mt-4 space-y-4">
            {/* Thông tin nhân viên */}
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/80">
              <div className="text-sm font-semibold text-slate-800">{reviewingEmployee.fullName}</div>
              <div className="text-xs text-slate-500">{reviewingEmployee.email} · {reviewingEmployee.departmentName || 'Chưa phân phòng ban'}</div>
            </div>

            {/* Điểm KPI & Thanh trượt */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Điểm KPI (0 - 100) <span className="text-rose-500">*</span>
                </label>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {kpiScore} / 100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={kpiScore}
                onChange={e => handleScoreChange(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0 (Kém)</span>
                <span>50 (Đạt)</span>
                <span>70 (Tốt)</span>
                <span>100 (Xuất sắc)</span>
              </div>
            </div>

            {/* Xếp loại */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Xếp loại đánh giá <span className="text-rose-500">*</span>
              </label>
              <select
                value={ratingRank}
                onChange={e => setRatingRank(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
              >
                <option value="EXCELLENT">🌟 Xuất sắc (EXCELLENT - từ 90 đến 100 điểm)</option>
                <option value="GOOD">👍 Tốt (GOOD - từ 70 đến 89 điểm)</option>
                <option value="AVERAGE">👌 Đạt yêu cầu (AVERAGE - từ 50 đến 69 điểm)</option>
                <option value="POOR">⚠️ Cần cải thiện (POOR - dưới 50 điểm)</option>
              </select>
            </div>

            {/* Nhận xét của Quản lý */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Nhận xét & Góp ý của Quản lý / Reviewer
              </label>
              <textarea
                rows={3}
                value={managerComment}
                onChange={e => setManagerComment(e.target.value)}
                placeholder="Nhập nhận xét chi tiết về hiệu quả công việc, thái độ và đề xuất phát triển..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
              />
            </div>

            {reviewError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewingEmployee(null)}
                disabled={submittingReview}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submittingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {submittingReview ? 'Đang lưu…' : 'Xác nhận nộp đánh giá'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </section>;
}
