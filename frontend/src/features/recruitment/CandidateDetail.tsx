import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { recruitmentApi as api } from './api';
import type { Candidate, Capabilities, Interview } from './types';
import { statusLabels } from './types';
import { Alert, Dialog, Field, buttonClass, errorText, inputClass, secondaryClass } from './ui';

function ResultForm({ interview, busy, save }: { interview: Interview; busy: boolean; save: (input: { score: number; feedback: string; result: 'PASSED' | 'FAILED' }) => void }) {
  const [score, setScore] = useState(interview.score?.toString() || ''); const [feedback, setFeedback] = useState(interview.feedback || '');
  const [result, setResult] = useState<'PASSED' | 'FAILED'>(interview.result === 'FAILED' ? 'FAILED' : 'PASSED');
  return <form onSubmit={e => { e.preventDefault(); save({ score: Number(score), feedback, result }); }} className="mt-4 space-y-3">
    <fieldset disabled={busy} className="space-y-3">
      <div className="grid grid-cols-2 gap-3"><Field label="Điểm phỏng vấn (0–100)"><input required type="number" min={0} max={100} step={1} value={score} onChange={e => setScore(e.target.value)} className={inputClass} /></Field><Field label="Kết quả"><select value={result} onChange={e => setResult(e.target.value as 'PASSED' | 'FAILED')} className={inputClass}><option value="PASSED">Đạt</option><option value="FAILED">Chưa đạt</option></select></Field></div>
      <Field label="Nhận xét chuyên môn"><textarea required maxLength={5000} rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} className={inputClass} /></Field>
      <button className={buttonClass}>Lưu kết quả vòng {interview.round}</button>
    </fieldset>
  </form>;
}

export function CandidateDetail({ id, capabilities, close, changed, focusSchedule = false }: { id: number; capabilities: Capabilities | null; close: () => void; changed: () => void; focusSchedule?: boolean }) {
  const { user } = useAuth(); const operator = user?.role === 'HR' || user?.role === 'SUPERADMIN';
  const [candidate, setCandidate] = useState<Candidate | null>(null); const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [interviewers, setInterviewers] = useState<{ id: number; fullName: string }[]>([]);
  const [interviewerId, setInterviewer] = useState(''); const [scheduledAt, setScheduledAt] = useState('');
  const [scorePreview, setScorePreview] = useState<string>(''); const [questionPreview, setQuestionPreview] = useState<string[]>([]);
  const [confirmReject, setConfirmReject] = useState(false);
  const [peopleError, setPeopleError] = useState(''); const [peopleAttempt, setPeopleAttempt] = useState(0);
  const scheduleSelect = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    let active = true;
    api.candidate(id).then(value => {
      if (!active) return; setCandidate(value);
    }).catch(e => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [id, operator]);
  const jobId = candidate?.jobId;
  useEffect(() => {
    if (!operator || !jobId) return;
    let active = true;
    api.interviewers(jobId).then(people => { if (active) { setInterviewers(people); setPeopleError(''); } })
      .catch(e => { if (active) setPeopleError(errorText(e)); });
    return () => { active = false; };
  }, [jobId, operator, peopleAttempt]);
  useEffect(() => { if (focusSchedule && jobId) scheduleSelect.current?.focus(); }, [focusSchedule, jobId]);
  async function act(action: () => Promise<string | void>) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { const message = await action(); setCandidate(await api.candidate(id)); changed(); if (message) setNotice(message); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError('');
    try {
      const blob = await api.cv(id); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'CV-' + id + '.pdf'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  const terminal = candidate && ['HIRED', 'REJECTED'].includes(candidate.status);
  return <Dialog title={candidate ? candidate.candidateName : 'Hồ sơ ứng viên'} close={() => { if (!busy) close(); }}>
    <div className="space-y-5">
      {error && <Alert>{error} <button className={secondaryClass} disabled={busy} onClick={() => act(async () => {})}>Tải lại</button></Alert>}{notice && <Alert success>{notice}</Alert>}
      {!candidate ? !error && <p role="status">Đang tải hồ sơ...</p> : <>
        <div><p className="font-medium">{candidate.jobTitle} · {statusLabels[candidate.status]}</p><p className="mt-2 break-words text-sm text-slate-600">{candidate.candidateEmail} · {candidate.candidatePhone || 'Chưa có số điện thoại'}</p></div>
        <div className="flex flex-wrap gap-2"><button className={secondaryClass} disabled={busy || !candidate.hasCv} onClick={download}>Tải CV PDF</button><button className={secondaryClass} disabled={busy} onClick={() => act(async () => { setConfirmReject(false); return 'Đã tải lại hồ sơ.'; })}>Tải lại hồ sơ</button></div>
        {!candidate.hasCvText && <Alert>CV không có văn bản để AI đọc. Hãy tải PDF và đánh giá thủ công.</Alert>}
        <section className="space-y-3 rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Đánh giá CV</h3><p>Điểm phù hợp: <strong>{candidate.matchScore === null ? 'Chưa chấm' : candidate.matchScore + '/100'}</strong></p>
          {candidate.aiSummary && <p className="whitespace-pre-wrap text-sm">{candidate.aiSummary}</p>}{candidate.skillsDetected.length > 0 && <p className="text-sm">Kỹ năng: {candidate.skillsDetected.join(', ')}</p>}
          {operator && <button className={secondaryClass} disabled={busy || !capabilities?.score || !candidate.hasCvText || !!terminal} onClick={() => act(async () => { const result = await api.score(id); setScorePreview(result.mode === 'MOCK' ? result.data.matchScore + '/100 · ' + result.data.summary : ''); return result.saved ? 'Đã lưu đánh giá AI.' : 'Kết quả mô phỏng chỉ để xem trước, không lưu vào hồ sơ.'; })}>Chấm CV bằng AI</button>}
          {operator && !capabilities?.score && <p className="text-xs text-slate-500">Chấm CV bằng AI đang chờ tích hợp.</p>}
          {scorePreview && <Alert>Bản xem trước MOCK: {scorePreview}</Alert>}
          <p className="text-xs text-slate-500">Điểm AI là thông tin tham khảo. HR và người phỏng vấn quyết định dựa trên hồ sơ và trao đổi thực tế.</p>
        </section>
        {operator && ['APPLIED', 'INTERVIEWING'].includes(candidate.status) && <form onSubmit={e => { e.preventDefault(); act(async () => { const result = await api.schedule(id, { interviewerId: Number(interviewerId), scheduledAt: new Date(scheduledAt).toISOString(), round: Math.max(0, ...candidate.interviews.map(i => i.round)) + 1 }); return result.message; }); }} className="space-y-3 rounded-xl border p-4">
          <h3 className="font-bold">Xếp lịch vòng {Math.max(0, ...candidate.interviews.map(i => i.round)) + 1}</h3>
          <fieldset disabled={busy} className="space-y-3">
            <Field label="Manager cùng phòng ban"><select ref={scheduleSelect} required className={inputClass} value={interviewerId} onChange={e => setInterviewer(e.target.value)}><option value="">Chọn người phỏng vấn</option>{interviewers.map(i => <option key={i.id} value={i.id}>{i.fullName}</option>)}</select></Field>
            {peopleError ? <Alert>Không tải được người phỏng vấn: {peopleError} <button type="button" className={secondaryClass} onClick={() => setPeopleAttempt(value => value + 1)}>Tải lại Manager</button></Alert> : !interviewers.length && <p className="text-sm text-amber-700">Chưa có Manager đang hoạt động trong phòng ban này.</p>}
            <Field label={'Thời gian (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')'}><input required type="datetime-local" className={inputClass} value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></Field>
            <button className={buttonClass} disabled={!interviewers.length}>Lưu lịch phỏng vấn</button>
          </fieldset>
        </form>}
        <section className="space-y-3"><h3 className="font-bold">Các vòng phỏng vấn</h3>
          {!candidate.interviews.length && <p className="text-sm text-slate-500">Chưa có lịch phỏng vấn.</p>}
          {candidate.interviews.map(interview => <article key={interview.id} className="rounded-xl border p-4">
            <h4 className="font-semibold">Vòng {interview.round} · {interview.interviewerName}</h4><p className="mt-1 text-sm">{new Date(interview.scheduledAt).toLocaleString('vi-VN')} · {interview.result === 'PENDING' ? 'Chưa chấm' : interview.result === 'PASSED' ? 'Đạt' : 'Chưa đạt'}{interview.score !== null ? ' · ' + interview.score + '/100' : ''}</p>
            {interview.meetingLink && /^https:\/\//i.test(interview.meetingLink) ? <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline">Mở phòng phỏng vấn</a> : <p className="mt-1 text-xs text-slate-500">Chưa có liên kết cuộc họp.</p>}
            {interview.feedback && <p className="mt-2 whitespace-pre-wrap text-sm">{interview.feedback}</p>}
            {interview.questions.length > 0 && <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{interview.questions.map((q, index) => <li key={index}>{q}</li>)}</ol>}
            {operator && <button className={secondaryClass + ' mt-3'} disabled={busy || !capabilities?.questions || !candidate.hasCvText || candidate.status !== 'INTERVIEWING' || interview.result !== 'PENDING'} onClick={() => act(async () => { const result = await api.questions(interview.id); setQuestionPreview(result.mode === 'MOCK' ? result.data : []); return result.saved ? 'Đã lưu bộ câu hỏi.' : 'Câu hỏi MOCK chỉ để xem trước.'; })}>Gợi ý câu hỏi AI</button>}
            {!operator && interview.interviewerId === user?.id && candidate.status === 'INTERVIEWING' && <ResultForm key={interview.updatedAt} interview={interview} busy={busy} save={input => act(async () => { await api.result(interview, input); return 'Đã lưu kết quả phỏng vấn.'; })} />}
          </article>)}
          {questionPreview.length > 0 && <Alert>MOCK — chưa lưu: <ol className="list-decimal pl-5">{questionPreview.map((q, index) => <li key={index}>{q}</li>)}</ol></Alert>}
        </section>
        {operator && !terminal && <section className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            {candidate.status === 'INTERVIEWING' && <button className={buttonClass} disabled={busy || candidate.interviews[0]?.result !== 'PASSED'} onClick={() => act(async () => { await api.state(candidate, 'OFFERED'); return 'Đã chuyển sang đề xuất nhận việc.'; })}>Đề xuất nhận việc</button>}
            <button className={secondaryClass} disabled={busy} onClick={() => setConfirmReject(true)}>Từ chối hồ sơ</button>
            <button className={buttonClass} disabled={busy || !capabilities?.hire || candidate.interviews[0]?.result !== 'PASSED'} onClick={() => act(async () => { const result = await api.hire(id); return 'Đã nhận việc, mã nhân viên #' + result.hiredUserId; })}>Nhận việc (Hire)</button>
          </div>
          {!capabilities?.hire && <p className="text-sm text-amber-800">Bước nhận việc đang chờ tích hợp tạo tài khoản và nhiệm vụ onboarding. Bạn vẫn có thể hoàn thành đánh giá và đề xuất nhận việc.</p>}
          {confirmReject && <Alert>Từ chối hồ sơ sẽ kết thúc quy trình tuyển dụng này. <div className="mt-3 flex gap-2"><button className={secondaryClass} disabled={busy} onClick={() => setConfirmReject(false)}>Hủy</button><button className={buttonClass} disabled={busy} onClick={() => act(async () => { await api.state(candidate, 'REJECTED'); setConfirmReject(false); return 'Đã từ chối hồ sơ.'; })}>Xác nhận từ chối</button></div></Alert>}
        </section>}
        {busy && <p role="status" className="text-sm text-indigo-700">Đang xử lý, vui lòng chờ...</p>}
      </>}
    </div>
  </Dialog>;
}
