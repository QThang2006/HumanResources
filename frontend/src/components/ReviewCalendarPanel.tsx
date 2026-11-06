import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarDays, Check, Loader2, RefreshCw, Save, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reviewCalendarApi, type ReviewCalendarBoard, type ReviewCalendarUpdate, type ReviewDelivery } from '../api/review-calendar.api';
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
  const allowed = canEdit || user?.role === 'HR';
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
      <div className="tv4-review-table-wrap"><table><caption className="sr-only">Nhân viên và kết quả thông báo kỳ {period}</caption><thead><tr><th scope="col">Nhân viên</th><th scope="col">Phòng ban</th><th scope="col">Đánh giá</th><th scope="col">Thông báo mở kỳ</th><th scope="col">Nhắc lần hai</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td><strong>{employee.fullName}</strong><small>{employee.email}</small></td><td>{employee.departmentName || 'Chưa có phòng ban'}</td><td><span className={`tv4-review-status ${employee.submitted ? 'is-sent' : 'is-pending'}`}>{employee.submitted ? 'Đã đánh giá' : 'Chưa đánh giá'}</span></td><td><DeliveryBadge delivery={employee.openingDelivery} /></td><td><DeliveryBadge delivery={employee.followUpDelivery} /></td></tr>)}</tbody></table></div>
      {!employees.length && <div className="tv4-review-empty"><p>{board.count === 0 ? 'Chưa có nhân viên đang hoạt động để theo dõi.' : 'Không có nhân viên phù hợp bộ lọc.'}</p>{(query || filter !== 'ALL') && <button type="button" className="tv4-user-button" onClick={() => { setQuery(''); setFilter('ALL'); }}>Xóa bộ lọc</button>}</div>}
    </>}
  </section>;
}
