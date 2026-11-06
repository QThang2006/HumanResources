import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, FileCheck2, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { offboardingApi, type OffboardingCase, type OffboardingInput } from '../api/offboarding.api';
import { usersApi } from '../api/users.api';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { TrainingToast } from './TrainingToast';
import { createOffboardingDraft, validateOffboarding, vietnamToday } from './offboarding';
import { OffboardingDetailsDrawer } from './OffboardingDetailsDrawer';
import { useOffboardingTracking } from './use-offboarding-tracking';
import './offboarding.css';

type Employee = User & { isActive?: boolean; department?: { name?: string } };
const dateLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối hệ thống.';

export function OffboardingPanel({ active = true }: { active?: boolean }) {
  const { user } = useAuth();
  const allowed = user?.role === 'HR' || user?.role === 'SUPERADMIN';
  const [records, setRecords] = useState<OffboardingCase[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<number, OffboardingInput>>({});
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [formError, setFormError] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [retryId, setRetryId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const [step, setStep] = useState(1);
  const [trackingCycle, setTrackingCycle] = useState(0);
  const lock = useRef(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setLoadError('');
    try {
      const [cases, users] = await Promise.all([offboardingApi.list(), usersApi.getAll()]);
      if (alive.current && current === generation.current) { setRecords(cases); setEmployees(users.map(employee => ({ ...employee, departmentName: employee.departmentName || (employee as Employee).department?.name }))); }
    } catch (error) { if (alive.current && current === generation.current) setLoadError(errorText(error)); }
    finally { if (alive.current && current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true;
    const timer = window.setTimeout(() => { if (allowed) void reload(); }, 0);
    return () => { alive.current = false; window.clearTimeout(timer); };
  }, [allowed, reload]);
  useEffect(() => { if (creating) formHeading.current?.focus(); }, [creating, step]);
  const pendingKey = records.filter(record => ['APPROVED', 'IN_PROGRESS'].includes(record.status)).map(record => record.id).sort((a, b) => a - b).join(',');
  const applyTracking = useCallback((cases: OffboardingCase[]) => { if (!lock.current) setRecords(cases); }, []);
  const tracking = useOffboardingTracking(allowed && active && !busy && !loading, pendingKey, trackingCycle, applyTracking);
  const refresh = () => { setTrackingCycle(value => value + 1); void reload(); };

  if (!allowed) return null;
  const occupied = new Set(records.filter(record => record.status !== 'CANCELLED').map(record => record.employee.id));
  const eligible = employees.filter(employee => employee.role === 'EMPLOYEE' && employee.isActive !== false && !occupied.has(employee.id));
  const selected = Object.values(drafts);
  const visible = records.filter(record => (filter === 'ALL' || (filter === 'ATTENTION' ? ['PARTIAL', 'FAILED'].includes(record.status) : record.status === filter)) && `${record.id} ${record.employee.fullName || ''} ${record.employee.email || ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const updateDraft = (id: number, patch: Partial<OffboardingInput>) => { setDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } })); setConfirming(false); setFormError(''); };
  const closeForm = () => { setCreating(false); setDrafts({}); setConfirming(false); setDiscarding(false); setFormError(''); setStep(1); setPickerQuery(''); newButton.current?.focus(); };
  const requestApproval = (event: FormEvent) => {
    event.preventDefault(); if (lock.current) return;
    if (!selected.length) { setFormError('Chọn ít nhất một nhân viên.'); return; }
    if (step === 1) { setFormError(''); setStep(2); return; }
    for (const input of selected) {
      if (!eligible.some(employee => employee.id === input.userId)) { setFormError('Danh sách nhân viên đã thay đổi. Hãy tải lại trước khi tiếp tục.'); return; }
      const problem = validateOffboarding(input, vietnamToday());
      if (problem) { setFormError(`${employees.find(employee => employee.id === input.userId)?.fullName}: ${problem}`); return; }
    }
    setFormError(''); setConfirming(true); setStep(3);
  };
  const approve = async () => {
    if (lock.current || !confirming || loadError || !selected.length) return;
    const invalid = selected.find(input => validateOffboarding(input, vietnamToday()));
    if (invalid) { setFormError(validateOffboarding(invalid, vietnamToday())); setConfirming(false); setStep(2); return; }
    lock.current = true; setBusy(true); setOutcomes([]);
    const results: string[] = []; let queued = 0;
    // Each employee has an independent case. Never automatically repeat a POST
    // after an uncertain response: the server may already have saved the case.
    for (const input of selected) {
      const name = employees.find(employee => employee.id === input.userId)?.fullName || `#${input.userId}`;
      try {
        const result = await offboardingApi.approve({ ...input, personalEmail: input.personalEmail?.trim() });
        if (result.automationQueued) queued++;
        results.push(`${name}: hồ sơ #${result.offboarding.id} — ${result.automationQueued ? 'đã chuyển điều phối' : 'đã lưu, chưa chuyển được yêu cầu điều phối'}.`);
      } catch (error) { results.push(`${name}: ${errorText(error)} Chưa xác nhận được kết quả lưu; kiểm tra danh sách trước khi tạo lại.`); }
      if (alive.current) setOutcomes([...results]);
    }
    if (alive.current) {
      closeForm(); await reload();
      if (alive.current) setToast({ message: `Đã xử lý ${selected.length} yêu cầu, ${queued} yêu cầu được chuyển điều phối. Xem kết quả từng hồ sơ bên dưới.`, success: queued === selected.length });
    }
    lock.current = false; if (alive.current) setBusy(false);
  };
  const retry = async () => {
    if (lock.current || retryId === null) return;
    lock.current = true; setBusy(true);
    try {
      const result = await offboardingApi.retry(retryId);
      if (alive.current) setToast({ message: result.automationQueued ? 'Đã yêu cầu xử lý lại hồ sơ.' : 'Chưa chuyển được yêu cầu xử lý lại. Vui lòng thử lại sau.', success: result.automationQueued });
    } catch (error) { if (alive.current) setToast({ message: `${errorText(error)} Kiểm tra trạng thái hồ sơ trước khi thử lại.`, success: false }); }
    finally { if (alive.current) { setRetryId(null); await reload(); } lock.current = false; if (alive.current) setBusy(false); }
  };

  const detail = records.find(record => record.id === expanded);
  const pickerEmployees = eligible.filter(employee => `${employee.fullName} ${employee.email} ${employee.departmentName || ''}`.toLocaleLowerCase('vi').includes(pickerQuery.trim().toLocaleLowerCase('vi')));
  const filters = [['ALL','Tất cả'], ['APPROVED','Chờ điều phối'], ['IN_PROGRESS','Đang xử lý'], ['ATTENTION','Cần xử lý lại'], ['COMPLETED','Đã thông báo đủ']] as const;
  return <section className="tv4-offboarding" aria-labelledby="tv4-offboarding-title">
    {toast && <TrainingToast message={toast.message} success={toast.success} onClose={closeToast} />}
    <header className="tv4-off-heading"><div><h3 id="tv4-offboarding-title">Hồ sơ thôi việc</h3><p>Quản lý hồ sơ và thông báo bàn giao liên phòng ban.</p></div><div className="tv4-off-actions">
      <button type="button" className="tv4-user-button" disabled={loading || busy || creating} onClick={refresh}><RefreshCw size={16} aria-hidden="true" />Làm mới</button>
      <button ref={newButton} type="button" className="tv4-user-button is-primary" disabled={loading || busy || creating || Boolean(loadError)} onClick={() => { setCreating(true); setStep(1); setOutcomes([]); }}><Plus size={16} aria-hidden="true" />Tạo hồ sơ</button>
    </div></header>
    {loadError && <div className="tv4-off-feedback" role="alert"><p>{loadError}</p><button type="button" className="tv4-user-button" disabled={busy} onClick={refresh}>Tải lại danh sách</button></div>}
    {creating && <form className="tv4-off-form" onSubmit={requestApproval} noValidate aria-busy={busy}>
      <ol className="tv4-off-steps" aria-label="Các bước tạo hồ sơ">{['Chọn nhân viên','Thông tin thôi việc','Rà soát và duyệt'].map((title, index) => <li key={title} aria-current={step === index + 1 ? 'step' : undefined} className={step > index + 1 ? 'is-complete' : ''}><span>{step > index + 1 ? <Check size={15} aria-hidden="true" /> : index + 1}</span>{title}</li>)}</ol>
      <h4 tabIndex={-1} ref={formHeading}>{['Chọn nhân viên','Thông tin thôi việc','Rà soát hồ sơ'][step - 1]}</h4>
      <fieldset disabled={busy || Boolean(loadError)}>
        {step === 1 && <>
          <label className="tv4-off-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm nhân viên để tạo hồ sơ</span><input type="search" value={pickerQuery} onChange={event => setPickerQuery(event.target.value)} placeholder="Tìm tên, email, phòng ban…" /></label>
          <div className="tv4-off-picker">{pickerEmployees.map(employee => <label key={employee.id}>
            <input type="checkbox" checked={Boolean(drafts[employee.id])} onChange={event => {
              if (event.target.checked) updateDraft(employee.id, createOffboardingDraft(employee));
              else { setDrafts(current => { const next = { ...current }; delete next[employee.id]; return next; }); setConfirming(false); }
            }} /><span><strong>{employee.fullName}</strong><small>{employee.email} · {employee.departmentName || 'Chưa có phòng ban'}</small></span>
          </label>)}</div>
          {!pickerEmployees.length && <p>{eligible.length ? 'Không tìm thấy nhân viên theo từ khóa này.' : 'Không có nhân viên đủ điều kiện. Nhân viên đã có hồ sơ chưa hủy không thể được chọn lại.'}</p>}
          <p aria-live="polite">Đã chọn {selected.length} nhân viên.</p>
        </>}
        {step === 2 && <p className="tv4-off-note">Email nhận thông báo được điền từ tài khoản nhân viên; bạn có thể thay bằng địa chỉ khác.</p>}
        {step === 2 && selected.map(input => <fieldset key={input.userId} className="tv4-off-person"><legend>{employees.find(employee => employee.id === input.userId)?.fullName}</legend><div className="tv4-off-fields">
          <label><span>Ngày làm việc cuối <span className="tv4-off-required">· Bắt buộc</span></span><input type="date" required min={vietnamToday()} value={input.lastWorkingDate} onChange={event => updateDraft(input.userId, { lastWorkingDate: event.target.value })} /></label>
          <label><span>Email nhận thông báo <span className="tv4-off-required">· Bắt buộc</span></span><input type="email" required maxLength={255} autoComplete="off" value={input.personalEmail} onChange={event => updateDraft(input.userId, { personalEmail: event.target.value })} /></label>
          <label>Lý do thôi việc<textarea rows={3} maxLength={4000} value={input.reason} onChange={event => updateDraft(input.userId, { reason: event.target.value })} /></label>
          <label>Tài sản cần bàn giao<textarea rows={3} maxLength={4000} value={input.assetNotes} onChange={event => updateDraft(input.userId, { assetNotes: event.target.value })} /></label>
          <label className="tv4-off-wide">Đường dẫn khảo sát<input type="url" maxLength={1000} placeholder="https://…" value={input.exitSurveyUrl} onChange={event => updateDraft(input.userId, { exitSurveyUrl: event.target.value })} /></label>
        </div></fieldset>)}
        {step === 3 && <div className="tv4-off-review">
          <p>Kiểm tra thông tin trước khi duyệt {selected.length} hồ sơ.</p>
          {selected.map(input => <article key={input.userId}><h5>{employees.find(employee => employee.id === input.userId)?.fullName}</h5><dl>
            <div><dt>Ngày làm việc cuối</dt><dd>{dateLabel(input.lastWorkingDate)}</dd></div><div><dt>Email nhận thông báo</dt><dd>{input.personalEmail}</dd></div>
            <div><dt>Lý do</dt><dd>{input.reason || 'Không có ghi chú'}</dd></div><div><dt>Tài sản bàn giao</dt><dd>{input.assetNotes || 'Không có ghi chú'}</dd></div>
            <div className="tv4-off-wide"><dt>Khảo sát</dt><dd>{input.exitSurveyUrl || 'Không có đường dẫn riêng'}</dd></div>
          </dl></article>)}
          <p className="tv4-off-note">Khi duyệt, hệ thống sẽ lưu hồ sơ và gửi yêu cầu thông báo đến IT, Kế toán, nhân viên và kênh điều phối.</p>
        </div>}
        {formError && <p role="alert" className="tv4-off-error">{formError}</p>}
        {discarding ? <div className="tv4-off-confirm" role="group" aria-label="Bỏ hồ sơ chưa lưu"><p>Bỏ thông tin đang nhập?</p><button type="button" className="tv4-user-button" onClick={() => setDiscarding(false)}>Tiếp tục nhập</button><button type="button" className="tv4-user-button" onClick={closeForm}>Bỏ thay đổi</button></div> : <footer className="tv4-off-form-footer">
          <button type="button" className="tv4-user-button" onClick={() => selected.length ? setDiscarding(true) : closeForm()}>Hủy</button><div className="tv4-off-actions">
            {step > 1 && <button type="button" className="tv4-user-button" onClick={() => { setStep(step - 1); setConfirming(false); setFormError(''); }}>Quay lại</button>}
            {step < 3 ? <button type="submit" className="tv4-user-button is-primary" disabled={!selected.length}>{step === 1 ? 'Tiếp tục' : 'Rà soát hồ sơ'}</button> : <button type="button" className="tv4-user-button is-primary" onClick={() => void approve()}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{busy ? 'Đang xử lý…' : 'Duyệt và gửi thông báo'}</button>}
          </div></footer>}
      </fieldset>
    </form>}
    {outcomes.length > 0 && <div className="tv4-off-feedback" role="status"><strong>Kết quả tạo hồ sơ</strong><ul>{outcomes.map((outcome, index) => <li key={index}>{outcome}</li>)}</ul></div>}
    {!creating && <>
      <div className="tv4-off-toolbar"><label className="tv4-off-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm hồ sơ</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã hồ sơ, tên, email…" /></label><span>{visible.length} hồ sơ</span></div>
      <div className="tv4-off-filters" aria-label="Lọc hồ sơ">{filters.map(([value,title]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{title}</button>)}</div>
      {pendingKey && <p className="tv4-off-tracking" role="status">{tracking === 'offline' ? 'Chưa tải được kết quả mới. Hệ thống sẽ thử kiểm tra lại.' : tracking === 'waiting' ? 'Chưa nhận được kết quả hoàn tất. Chọn Làm mới để tiếp tục theo dõi.' : 'Đang theo dõi kết quả điều phối…'}</p>}
      {loading && !records.length ? <p className="tv4-off-feedback" role="status">Đang tải hồ sơ…</p> : <>
        <div className="tv4-off-table"><table><caption className="sr-only">Hồ sơ và kết quả thông báo thôi việc</caption><thead><tr><th scope="col">Nhân viên / Hồ sơ</th><th scope="col">Ngày làm việc cuối</th><th scope="col">Người duyệt</th><th scope="col">Chi tiết</th></tr></thead><tbody>{visible.map(record => <tr key={record.id}>
          <td><strong>{record.employee.fullName || `Nhân viên #${record.employee.id}`}</strong><small>#{record.id} · {record.employee.email || 'Chưa có email'}</small><small>{employees.find(employee => employee.id === record.employee.id)?.departmentName || 'Chưa có phòng ban'}</small></td><td>{dateLabel(record.lastWorkingDate)}</td><td>{record.approvedBy.fullName || `#${record.approvedBy.id}`}</td><td><button type="button" className="tv4-user-button" disabled={busy} onClick={() => { setExpanded(record.id); setRetryId(null); }} aria-label={`Xem hồ sơ #${record.id}`}>Xem hồ sơ</button></td>
        </tr>)}</tbody></table></div>
        {!visible.length && !loadError && <div className="tv4-off-empty"><FileCheck2 size={28} aria-hidden="true" /><h4>{records.length ? 'Không có hồ sơ phù hợp' : 'Chưa có hồ sơ thôi việc'}</h4><p>{records.length ? 'Thay đổi từ khóa hoặc bộ lọc để xem hồ sơ.' : 'Tạo hồ sơ để bắt đầu điều phối thông báo liên phòng ban.'}</p></div>}
      </>}
    </>}
    {detail && active && <OffboardingDetailsDrawer record={detail} departmentName={employees.find(employee => employee.id === detail.employee.id)?.departmentName} busy={busy} confirmingRetry={retryId === detail.id} onClose={() => { setExpanded(null); setRetryId(null); }} onRequestRetry={() => setRetryId(detail.id)} onCancelRetry={() => setRetryId(null)} onConfirmRetry={() => void retry()} />}
  </section>;
}
