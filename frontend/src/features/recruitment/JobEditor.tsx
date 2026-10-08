import { useEffect, useState } from 'react';
import { recruitmentApi as api } from './api';
import type { Capabilities, Job, JobInput, Lookup } from './types';
import { Alert, Dialog, Field, buttonClass, errorText, inputClass, secondaryClass } from './ui';

export function JobEditor({ job, capabilities, close, saved }: { job: Job | null; capabilities: Capabilities | null; close: () => void; saved: (job: Job) => void }) {
  const [input, setInput] = useState<JobInput>(() => job ? { title: job.title, departmentId: job.departmentId, location: job.location || '', salaryRange: job.salaryRange || '', description: job.description, requirements: job.requirements } : { title: '', departmentId: 0, location: 'Hồ Chí Minh', salaryRange: 'Thỏa thuận', description: '', requirements: '' });
  const [departments, setDepartments] = useState<Lookup[]>([]); const [level, setLevel] = useState('Junior');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState(''); const [lookupAttempt, setLookupAttempt] = useState(0);
  const [preview, setPreview] = useState<{ mode: string; data: { description: string; requirements: string; benefits: string } } | null>(null);
  useEffect(() => { let active = true; api.departments().then(data => { if (active) { setDepartments(data); setLookupError(''); } }).catch(e => { if (active) setLookupError(errorText(e)); }); return () => { active = false; }; }, [lookupAttempt]);
  const field = (key: keyof JobInput, value: string | number) => setInput(current => ({ ...current, [key]: value }));
  async function generate() {
    setBusy(true); setError('');
    try { setPreview(await api.jd(input.title, departments.find(d => d.id === input.departmentId)?.name || '', level)); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { saved(job ? await api.updateJob(job, input) : await api.createJob(input)); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <Dialog title={job ? 'Chỉnh sửa vị trí tuyển dụng' : 'Tạo vị trí tuyển dụng'} close={() => { if (!busy) close(); }}>
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {lookupError && <Alert>Không tải được phòng ban: {lookupError} <button type="button" className={secondaryClass} onClick={() => setLookupAttempt(value => value + 1)}>Tải lại phòng ban</button></Alert>}
      <fieldset disabled={busy} className="space-y-4">
        <Field label="Tên vị trí"><input required maxLength={200} className={inputClass} value={input.title} onChange={e => field('title', e.target.value)} /></Field>
        <Field label="Phòng ban"><select required className={inputClass} value={input.departmentId || ''} onChange={e => field('departmentId', Number(e.target.value))}><option value="">Chọn phòng ban</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Địa điểm"><input required maxLength={150} className={inputClass} value={input.location} onChange={e => field('location', e.target.value)} /></Field><Field label="Mức lương"><input required maxLength={100} className={inputClass} value={input.salaryRange} onChange={e => field('salaryRange', e.target.value)} /></Field></div>
        <div className="space-y-3 rounded-xl bg-indigo-50 p-4">
          <Field label="Cấp bậc để gợi ý JD"><input maxLength={80} className={inputClass} value={level} onChange={e => setLevel(e.target.value)} /></Field>
          <button type="button" className={secondaryClass} disabled={!capabilities?.jd || !input.title.trim() || !input.departmentId || !level.trim()} onClick={generate}>Gợi ý JD bằng AI</button>
          {!capabilities?.jd && <p className="text-xs text-slate-600">Tính năng AI đang chờ tích hợp. Bạn có thể tự nhập JD.</p>}
        </div>
        {preview && <section className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">Bản nháp AI · {preview.mode === 'MOCK' ? 'Dữ liệu mô phỏng' : 'LIVE'}</h3><p className="whitespace-pre-wrap text-sm">{preview.data.description}</p><p className="whitespace-pre-wrap text-sm">{preview.data.requirements}</p>{preview.data.benefits && <p className="whitespace-pre-wrap text-sm">{preview.data.benefits}</p>}<button type="button" className={secondaryClass} onClick={() => { setInput(current => ({ ...current, description: preview.data.description + (preview.data.benefits ? '\n\nQuyền lợi\n' + preview.data.benefits : ''), requirements: preview.data.requirements })); setPreview(null); }}>Đưa vào biểu mẫu để chỉnh sửa</button></section>}
        <Field label="Mô tả công việc"><textarea required rows={7} maxLength={20000} className={inputClass} value={input.description} onChange={e => field('description', e.target.value)} /></Field>
        <Field label="Yêu cầu ứng viên"><textarea required rows={6} maxLength={20000} className={inputClass} value={input.requirements} onChange={e => field('requirements', e.target.value)} /></Field>
      </fieldset>
      <button className={buttonClass} disabled={busy}>{busy ? 'Đang xử lý...' : job ? 'Lưu thay đổi' : 'Đăng tuyển'}</button>
    </form>
  </Dialog>;
}
