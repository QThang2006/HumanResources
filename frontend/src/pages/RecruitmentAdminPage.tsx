import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { recruitmentApi as api } from '../features/recruitment/api';
import type { CandidatePage, Capabilities, Job, Page } from '../features/recruitment/types';
import { statusLabels } from '../features/recruitment/types';
import { Alert, Field, Pagination, buttonClass, errorText, inputClass, secondaryClass } from '../features/recruitment/ui';
import { JobEditor } from '../features/recruitment/JobEditor';
import { CandidateDetail } from '../features/recruitment/CandidateDetail';
import { InterviewSchedule } from '../features/recruitment/InterviewSchedule';

function RecruitmentLogin() {
  const { setAuthSession } = useAuth(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setError(''); setBusy(true);
    try { const result = await authApi.login({ email: String(data.get('email')), password: String(data.get('password')) }); setAuthSession(result.user, result.accessToken); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-4 py-16"><h1 className="text-2xl font-bold">Đăng nhập hệ thống tuyển dụng</h1><p className="my-4 text-sm text-slate-600">Sử dụng tài khoản HR hoặc Manager được cấp để thao tác trên hồ sơ thật.</p>
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6">{error && <Alert>{error}</Alert>}
      <Field label="Email"><input name="email" type="email" autoComplete="username" required className={inputClass} disabled={busy} /></Field>
      <Field label="Mật khẩu"><input name="password" type="password" autoComplete="current-password" required className={inputClass} disabled={busy} /></Field>
      <button className={buttonClass} disabled={busy}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
    </form>
  </main>;
}

function RecruitmentBoard() {
  const { user } = useAuth(); const operator = user?.role === 'HR' || user?.role === 'SUPERADMIN';
  const [jobs, setJobs] = useState<Page<Job>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [selected, setSelected] = useState<Job | null>(null); const [jobQuery, setJobQuery] = useState(''); const [jobPage, setJobPage] = useState(1);
  const [jobStatus, setJobStatus] = useState(''); const [jobLoading, setJobLoading] = useState(true); const [jobError, setJobError] = useState('');
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [data, setData] = useState<CandidatePage>({ items: [], total: 0, page: 1, pageSize: 30, counts: {} });
  const [q, setQ] = useState(''); const [minScore, setMinScore] = useState(''); const [rejected, setRejected] = useState(false);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0); const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{ job: Job | null } | null>(null); const [candidateId, setCandidateId] = useState<number | null>(null);
  const [loadedJobId, setLoadedJobId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null); const [boardNotice, setBoardNotice] = useState('');
  const [focusSchedule, setFocusSchedule] = useState(false);
  const [section, setSection] = useState<'board' | 'schedule'>('board');
  useEffect(() => { let active = true; api.capabilities().then(value => { if (active) setCapabilities(value); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setJobLoading(true); setJobError('');
    const timer = setTimeout(() => api.jobs({ q: jobQuery || undefined, page: jobPage, pageSize: 10, status: jobStatus || undefined }, true, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(value.total / 10));
      if (jobPage > lastPage) { setJobPage(lastPage); return; }
      setJobs(value);
      setSelected(current => value.items.find(j => j.id === current?.id) || value.items[0] || null);
    }).catch(e => { if (!controller.signal.aborted) setJobError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setJobLoading(false); }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [jobQuery, jobPage, jobStatus, revision]);
  const jobId = selected?.id;
  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController(); setLoading(true); setError('');
    const timer = setTimeout(() => api.candidates({ jobId, q: q || undefined, minScore: minScore || undefined, status: rejected ? 'REJECTED' : undefined, page, pageSize: 30 }, controller.signal)
      .then(value => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(value.total / 30));
        if (page > lastPage) { setPage(lastPage); return; }
        setData(value); setLoadedJobId(jobId);
      }).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [jobId, q, minScore, rejected, page, revision]);
  function choose(job: Job) { setSelected(job); setPage(1); setQ(''); setMinScore(''); setRejected(false); setCandidateId(null); setBoardNotice(''); setDraggedId(null); setLoadedJobId(null); setData({ items: [], total: 0, page: 1, pageSize: 30, counts: {} }); setRevision(value => value + 1); }
  function dropCandidate(target: string) {
    const candidate = data.items.find(item => item.id === draggedId);
    setDraggedId(null);
    if (!operator || !candidate || candidate.jobId !== jobId || target === candidate.status) return;
    if (target === 'INTERVIEWING' && candidate.status === 'APPLIED') {
      setFocusSchedule(true); setCandidateId(candidate.id); setBoardNotice('');
    } else {
      setBoardNotice(target === 'HIRED'
        ? 'Bước nhận việc đang chờ tích hợp tài khoản và onboarding. Hồ sơ chưa đổi trạng thái.'
        : 'Chưa chuyển hồ sơ. Hãy mở hồ sơ và dùng thao tác phù hợp với trạng thái hiện tại.');
    }
  }
  async function toggleStatus() {
    if (!selected || busy) return; setBusy(true); setError('');
    try { setSelected(await api.jobStatus(selected)); setRevision(v => v + 1); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  const columns = rejected ? [{ title: 'Đã từ chối', statuses: ['REJECTED'], color: 'bg-rose-100' }] : [
    { title: 'Mới nộp', statuses: ['APPLIED'], color: 'bg-blue-100' },
    { title: 'Đang phỏng vấn / Đề xuất', statuses: ['INTERVIEWING', 'OFFERED'], color: 'bg-amber-100' },
    { title: 'Đã nhận việc', statuses: ['HIRED'], color: 'bg-emerald-100' },
  ];
  return <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-indigo-600">{operator ? 'Bàn tuyển dụng HR' : 'Không gian phỏng vấn Manager'}</p><h1 className="mt-1 text-3xl font-bold">Quản lý tuyển dụng</h1></div>{operator && <button className={buttonClass} onClick={() => setEditor({ job: null })}>+ Đăng tuyển</button>}</header>
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit" role="group" aria-label="Không gian tuyển dụng"><button aria-pressed={section === 'board'} onClick={() => setSection('board')} className={'rounded-lg px-4 py-2.5 text-sm font-semibold ' + (section === 'board' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/70')}>Bảng ứng viên</button><button aria-pressed={section === 'schedule'} onClick={() => setSection('schedule')} className={'rounded-lg px-4 py-2.5 text-sm font-semibold ' + (section === 'schedule' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/70')}>Lịch phỏng vấn</button></div>
    {section === 'schedule' ? <InterviewSchedule openCandidate={id => { setFocusSchedule(false); setCandidateId(id); }} /> : <div className="grid items-start gap-6 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="font-bold">Vị trí tuyển dụng</h2>
        <input aria-label="Tìm vị trí tuyển dụng" placeholder="Tìm vị trí..." maxLength={150} className={inputClass} value={jobQuery} onChange={e => { setJobQuery(e.target.value); setJobPage(1); }} />
        <select aria-label="Trạng thái tin tuyển dụng" className={inputClass} value={jobStatus} onChange={e => { setJobStatus(e.target.value); setJobPage(1); }}><option value="">Tất cả trạng thái</option><option value="OPEN">Đang mở</option><option value="CLOSED">Đã đóng</option></select>
        {jobError && <Alert>{jobError}<button className={secondaryClass} onClick={() => setRevision(v => v + 1)}>Thử lại</button></Alert>}
        {jobLoading ? <p role="status" className="text-sm">Đang tải vị trí...</p> : jobs.items.length ? jobs.items.map(job => <button key={job.id} onClick={() => choose(job)} aria-pressed={selected?.id === job.id} className={'block w-full rounded-xl border p-3 text-left ' + (selected?.id === job.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50')}><span className="block font-semibold">{job.title}</span><span className="mt-1 block text-xs text-slate-500">{job.departmentName} · {job.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'} · {job.applicationCount} hồ sơ</span></button>) : <p className="text-sm text-slate-500">Chưa có vị trí phù hợp.</p>}
        <Pagination page={jobPage} total={jobs.total} pageSize={10} change={setJobPage} />
      </aside>
      <section className="min-w-0 space-y-4">
        {!selected ? <p className="rounded-2xl border border-dashed p-12 text-center text-slate-500">Chọn hoặc tạo vị trí tuyển dụng để bắt đầu.</p> : <>
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-white p-5"><div><h2 className="text-xl font-bold">{selected.title}</h2><p className="mt-1 text-sm text-slate-500">{selected.departmentName} · {selected.status === 'OPEN' ? 'Đang mở ứng tuyển' : 'Đã đóng ứng tuyển'}</p></div>{operator && <div className="flex gap-2"><button className={secondaryClass} onClick={() => setEditor({ job: selected })}>Sửa JD</button><button disabled={busy} className={secondaryClass} onClick={toggleStatus}>{selected.status === 'OPEN' ? 'Đóng tuyển' : 'Mở lại'}</button></div>}</header>
          <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_180px_auto]">
            <Field label="Tên hoặc email ứng viên"><input maxLength={150} className={inputClass} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></Field>
            <Field label="Điểm AI tối thiểu"><input type="number" min={0} max={100} step={1} className={inputClass} value={minScore} onChange={e => { setMinScore(e.target.value); setPage(1); }} /></Field>
            <label className="flex items-center gap-2 self-end py-3 text-sm"><input type="checkbox" checked={rejected} onChange={e => { setRejected(e.target.checked); setPage(1); }} />Chỉ hồ sơ bị từ chối</label>
          </div>
          {error && <Alert>{error}<button className={secondaryClass} onClick={() => setRevision(v => v + 1)}>Tải lại</button></Alert>}
          {boardNotice && <Alert>{boardNotice}</Alert>}
          {loading || (!error && loadedJobId !== jobId) ? <p role="status">Đang tải hồ sơ...</p> : !error && <><div className={'grid items-start gap-4 ' + (rejected ? '' : 'lg:grid-cols-3')}>
            {columns.map(column => <section key={column.title} aria-label={column.title} onDragOver={event => { if (operator && draggedId !== null) event.preventDefault(); }} onDrop={event => { event.preventDefault(); dropCandidate(column.statuses[0]); }} className="min-w-0 rounded-2xl border bg-slate-50 p-3"><h3 className={'mb-3 rounded-xl px-3 py-2 text-sm font-bold ' + column.color}>{column.title} · {column.statuses.reduce((sum, status) => sum + (data.counts[status as keyof typeof data.counts] || 0), 0)}</h3>
              <div className="space-y-3">{data.items.filter(c => column.statuses.includes(c.status)).map(candidate => <button key={candidate.id} draggable={operator && !['HIRED', 'REJECTED'].includes(candidate.status)} onDragStart={event => { setDraggedId(candidate.id); event.dataTransfer.setData('text/plain', String(candidate.id)); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedId(null)} onClick={() => { setFocusSchedule(false); setCandidateId(candidate.id); }} className="block w-full rounded-xl border bg-white p-4 text-left shadow-sm hover:border-indigo-400 focus-visible:outline-indigo-600"><span className="block break-words font-semibold">{candidate.candidateName}</span><span className="mt-1 block truncate text-xs text-slate-500">{candidate.candidateEmail}</span><span className="mt-3 block text-sm text-indigo-700">{candidate.matchScore === null ? 'Chưa chấm CV' : 'AI: ' + candidate.matchScore + '/100'}</span><span className="mt-2 block text-xs text-slate-500">{statusLabels[candidate.status]}</span></button>)}
              {!data.items.some(c => column.statuses.includes(c.status)) && <p className="p-4 text-center text-sm text-slate-500">Không có hồ sơ trong trang này.</p>}</div>
            </section>)}
          </div><Pagination page={page} total={data.total} pageSize={30} change={setPage} /><p className="text-xs text-slate-500">Số ở đầu cột là tổng theo bộ lọc; thẻ ứng viên hiển thị theo trang. Kéo thẻ từ Mới nộp sang Phỏng vấn để mở form xếp lịch; chỉ đổi trạng thái sau khi lưu. Bạn cũng có thể bấm hoặc dùng bàn phím mở hồ sơ. Hồ sơ từ chối nằm trong bộ lọc riêng.</p></>}
        </>}
      </section>
    </div>}
    {editor && <JobEditor job={editor.job} capabilities={capabilities} close={() => setEditor(null)} saved={job => { choose(job); setEditor(null); }} />}
    {candidateId !== null && <CandidateDetail key={candidateId} id={candidateId} focusSchedule={focusSchedule} capabilities={capabilities} close={() => setCandidateId(null)} changed={() => setRevision(v => v + 1)} />}
  </main>;
}

export function RecruitmentAdminPage() {
  const { user } = useAuth();
  const token = localStorage.getItem('hr_access_token');
  return !token || token.startsWith('mock_') ? <RecruitmentLogin /> : <RecruitmentBoard key={user?.id + ':' + user?.role} />;
}
