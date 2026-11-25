import { OfferPanel } from './OfferPanel';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { recruitmentApi as api } from './api';
import type { Candidate, Capabilities, DepartmentManager, Interview } from './types';
import { statusLabels } from './types';
import { Alert, Dialog, Field, buttonClass, errorText, inputClass, secondaryClass } from './ui';
import { canManageInterview, toDateTimeLocalInput } from './interview-helpers';

function ResultForm({
  interview,
  busy,
  save,
  cancel,
}: {
  interview: Interview;
  busy: boolean;
  save: (input: { score: number; feedback: string; result: 'PASSED' | 'FAILED' }) => void;
  cancel?: () => void;
}) {
  const [score, setScore] = useState(interview.score?.toString() || '');
  const [feedback, setFeedback] = useState(interview.feedback || '');
  const [result, setResult] = useState<'PASSED' | 'FAILED'>(
    interview.result === 'FAILED' ? 'FAILED' : 'PASSED',
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ score: Number(score), feedback, result });
      }}
      className="mt-4 space-y-3"
    >
      <fieldset disabled={busy} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Điểm phỏng vấn (0–100)">
            <input
              required
              type="number"
              min={0}
              max={100}
              step={1}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Kết quả">
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as 'PASSED' | 'FAILED')}
              className={inputClass}
            >
              <option value="PASSED">Đạt</option>
              <option value="FAILED">Chưa đạt</option>
            </select>
          </Field>
        </div>
        <Field label="Nhận xét chuyên môn">
          <textarea
            required
            maxLength={5000}
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex gap-2">
          <button className={buttonClass}>Lưu kết quả vòng {interview.round}</button>
          {cancel && (
            <button type="button" className={secondaryClass} onClick={cancel}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

export function CandidateDetail({
  id,
  capabilities,
  close,
  changed,
  focusSchedule = false,
  focusHire = false,
}: {
  id: number;
  capabilities: Capabilities | null;
  close: () => void;
  changed: () => void;
  focusSchedule?: boolean;
  focusHire?: boolean;
}) {
  const { user } = useAuth();
  const operator = user?.role === 'HR' || user?.role === 'SUPERADMIN';
  const [offerStatus, setOfferStatus] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [interviewers, setInterviewers] = useState<DepartmentManager[]>([]);
  const [interviewerId, setInterviewer] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scorePreview, setScorePreview] = useState<string>('');
  const [questionPreview, setQuestionPreview] = useState<string[]>([]);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
  const [reschedulingInterviewId, setReschedulingInterviewId] = useState<number | null>(null);
  const [rescheduleInterviewerId, setRescheduleInterviewerId] = useState('');
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [cancellingInterviewId, setCancellingInterviewId] = useState<number | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmHire, setConfirmHire] = useState(focusHire);
  const [peopleError, setPeopleError] = useState('');
  const [peopleAttempt, setPeopleAttempt] = useState(0);
  const scheduleSelect = useRef<HTMLSelectElement>(null);
  const waitingForDelivery = !!candidate?.interviews.some((i) =>
    ['PENDING', 'RUNNING'].includes(i.automation?.status || ''),
  );
  const waitingForAi =
    ['PENDING', 'PROCESSING'].includes(candidate?.aiScoreStatus || '') ||
    !!candidate?.interviews.some((i) => i.aiQuestionsStatus === 'PROCESSING');
  useEffect(() => {
    if ((!waitingForDelivery && !waitingForAi) || busy) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const value = await api.candidate(id);
        if (active) {
          setCandidate(value);
          if (value.interviews[0]?.automation?.status === 'COMPLETED')
            setNotice('Đã tạo Google Meet. Máy chủ email đã chấp nhận gửi thư mời.');
        }
      } catch {
        /* Keep the last readback; manual refresh exposes network errors. */
      }
      if (active) timer = setTimeout(refresh, 3000);
    };
    timer = setTimeout(refresh, 3000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, busy, waitingForDelivery, waitingForAi]);
  useEffect(() => {
    let active = true;
    api
      .candidate(id)
      .then((value) => {
        if (!active) return;
        setCandidate(value);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [id, operator]);
  const jobId = candidate?.jobId;
  useEffect(() => {
    if (!operator || !jobId) return;
    let active = true;
    api
      .interviewers(jobId)
      .then((people) => {
        if (active) {
          setInterviewers(people);
          setPeopleError('');
        }
      })
      .catch((e) => {
        if (active) setPeopleError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [jobId, operator, peopleAttempt]);
  useEffect(() => {
    if (focusSchedule && jobId) scheduleSelect.current?.focus();
  }, [focusSchedule, jobId]);
  async function act(action: () => Promise<string | void>, refresh = true) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const message = await action();
      if (refresh) setCandidate(await api.candidate(id));
      changed();
      if (message) setNotice(message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError('');
    try {
      const blob = await api.cv(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = blob.type === 'application/pdf' ? 'pdf' : blob.type.split('/')[1] || 'bin';
      link.download = 'CV-' + id + '.' + extension;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const terminal = candidate && ['HIRED', 'REJECTED'].includes(candidate.status);
  const canHire =
    (!offerStatus || offerStatus === 'ACCEPTED') &&
    !!capabilities?.hire &&
    !!candidate &&
    ['INTERVIEWING', 'OFFERED'].includes(candidate.status) &&
    candidate.interviews[0]?.result === 'PASSED';
  return (
    <Dialog
      title={candidate ? candidate.candidateName : 'Hồ sơ ứng viên'}
      close={() => {
        if (!busy) close();
      }}
    >
      <div className="space-y-6">
        {error && (
          <Alert>
            {error}{' '}
            <button className={secondaryClass} disabled={busy} onClick={() => act(async () => {})}>
              Tải lại
            </button>
          </Alert>
        )}
        {notice && <Alert success>{notice}</Alert>}
        {!candidate ? (
          !error && <p role="status">Đang tải hồ sơ...</p>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {candidate.jobTitle} · {statusLabels[candidate.status]}
              </p>
              <p className="mt-2 break-words text-sm text-slate-600">
                {candidate.candidateEmail} · {candidate.candidatePhone || 'Chưa có số điện thoại'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={secondaryClass}
                disabled={busy || !candidate.hasCv}
                onClick={download}
              >
                Tải CV
              </button>
              <button
                className={secondaryClass}
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    setConfirmReject(false);
                    return 'Đã tải lại hồ sơ.';
                  })
                }
              >
                Tải lại hồ sơ
              </button>
            </div>
            {!candidate.hasCvText && (
              <Alert>CV không có lớp văn bản. AI Vision sẽ đọc trực tiếp PDF scan hoặc ảnh khi xử lý hồ sơ.</Alert>
            )}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Đánh giá CV</h3>
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                Điểm phù hợp:
                <strong className="inline-flex min-h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-base font-bold text-blue-700">
                  {candidate.matchScore === null ? 'Chưa chấm' : candidate.matchScore + '/100'}
                </strong>
              </p>
              {candidate.aiScoreStatus === 'PENDING' && (
                <p className="text-sm text-blue-700">CV đang chờ chấm tự động...</p>
              )}
              {candidate.aiScoreStatus === 'PROCESSING' && (
                <p className="text-sm text-blue-700">AI đang phân tích CV theo JD...</p>
              )}
              {candidate.aiScoreStatus === 'FAILED' && (
                <p className="text-sm text-amber-700">Lần chấm CV gần nhất chưa thành công. Bạn có thể thử lại.</p>
              )}
              {candidate.aiSummary && (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{candidate.aiSummary}</p>
              )}
              {candidate.skillsDetected.length > 0 && (
                <p className="break-words text-sm leading-relaxed text-slate-700">Kỹ năng: {candidate.skillsDetected.join(', ')}</p>
              )}
              {operator && (
                <button
                  className={secondaryClass}
                  disabled={busy || !capabilities?.score || !candidate.hasCv || !!terminal}
                  onClick={() =>
                    act(async () => {
                      const result = await api.score(id);
                      setScorePreview(result.mode === 'MOCK'
                        ? result.data.matchScore + '/100 · ' + result.data.summary
                        : (result.mode === 'N8N' || result.mode === 'BACKEND') ? 'Yêu cầu đang được xử lý; kết quả sẽ cập nhật tự động.' : '');
                      return result.saved
                        ? 'Đã lưu đánh giá AI.'
                        : (result.mode === 'N8N' || result.mode === 'BACKEND')
                          ? 'Đã xếp hàng chấm CV. Kết quả sẽ cập nhật tự động.'
                          : 'Kết quả mô phỏng chỉ để xem trước, không lưu vào hồ sơ.';
                    })
                  }
                >
                  Chấm CV bằng AI
                </button>
              )}
              {operator && !capabilities?.score && (
                <p className="text-xs text-slate-500">Chấm CV bằng AI đang chờ tích hợp.</p>
              )}
              {scorePreview && <Alert>{scorePreview}</Alert>}
              <p className="text-xs text-slate-500">
                Điểm AI là thông tin tham khảo. HR và người phỏng vấn quyết định dựa trên hồ sơ và
                trao đổi thực tế.
              </p>
            </section>
            {operator && ['APPLIED', 'INTERVIEWING'].includes(candidate.status) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    const result = await api.schedule(id, {
                      interviewerId: Number(interviewerId),
                      scheduledAt: new Date(scheduledAt).toISOString(),
                      round: Math.max(0, ...candidate.interviews.map((i) => i.round)) + 1,
                    });
                    return result.message;
                  });
                }}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <h3 className="font-bold">
                  Xếp lịch vòng {Math.max(0, ...candidate.interviews.map((i) => i.round)) + 1}
                </h3>
                <fieldset disabled={busy} className="space-y-3">
                  <Field label="Người phỏng vấn">
                    <select
                      ref={scheduleSelect}
                      required
                      className={inputClass}
                      value={interviewerId}
                      onChange={(e) => setInterviewer(e.target.value)}
                    >
                      <option value="">Chọn người phỏng vấn</option>
                      {interviewers.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.fullName} · {i.jobTitle || 'Chưa có chức danh'} · {i.role}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {peopleError ? (
                    <Alert>
                      Không tải được người phỏng vấn: {peopleError}{' '}
                      <button
                        type="button"
                        className={secondaryClass}
                        onClick={() => setPeopleAttempt((value) => value + 1)}
                      >
                        Tải lại danh sách
                      </button>
                    </Alert>
                  ) : (
                    !interviewers.length && (
                      <p className="text-sm text-amber-700">
                        Chưa có người phỏng vấn phù hợp. Nếu phòng ban chưa có Manager, HR hoặc SuperAdmin
                        có thể được chọn làm người phỏng vấn.
                      </p>
                    )
                  )}
                  <Field
                    label={'Thời gian (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')'}
                  >
                    <input
                      required
                      type="datetime-local"
                      className={inputClass}
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </Field>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động kiểm tra trùng lịch người phỏng vấn trong khung ±45 phút.
                  </p>
                  <button className={buttonClass} disabled={!interviewers.length}>
                    Lưu lịch phỏng vấn
                  </button>
                </fieldset>
              </form>
            )}
            <section className="space-y-3">
              <h3 className="font-bold">Các vòng phỏng vấn</h3>
              {!candidate.interviews.length && (
                <p className="text-sm text-slate-500">Chưa có lịch phỏng vấn.</p>
              )}
              {candidate.interviews.map((interview) => (
                <article key={interview.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="font-semibold">
                    Vòng {interview.round} · {interview.interviewerName}
                  </h4>
                  <p className="mt-1 text-sm">
                    {new Date(interview.scheduledAt).toLocaleString('vi-VN')} ·{' '}
                    {interview.result === 'PENDING'
                      ? 'Chưa chấm'
                      : interview.result === 'PASSED'
                        ? 'Đạt'
                        : 'Chưa đạt'}
                    {interview.score !== null ? ' · ' + interview.score + '/100' : ''}
                  </p>
                  {interview.meetingLink && /^https:\/\//i.test(interview.meetingLink) ? (
                    <a
                      href={interview.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-700 underline"
                    >
                      Mở phòng phỏng vấn
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Chưa có liên kết cuộc họp.</p>
                  )}
                  <div role="status" className="mt-2 space-y-1 text-xs text-slate-600">
                    <p>
                      {interview.automation?.calendarStatus === 'CONFIRMED'
                        ? 'Google Meet: Đã tạo và xác nhận lịch.'
                        : interview.automation?.calendarStatus === 'FAILED'
                          ? 'Workflow tạo Meet gặp lỗi; cần kiểm tra lịch Google.'
                          : ['PENDING', 'RUNNING'].includes(interview.automation?.status || '')
                            ? 'Google Meet: Đang chờ workflow.'
                            : 'Google Meet: Chưa nhận xác nhận từ workflow.'}
                    </p>
                    {interview.aiQuestionsStatus === 'PROCESSING' && (
                      <p className="text-blue-700">n8n đang tạo câu hỏi theo CV và JD...</p>
                    )}
                    {interview.aiQuestionsStatus === 'FAILED' && (
                      <p className="text-amber-700">n8n tạo câu hỏi thất bại. Có thể thử lại.</p>
                    )}
                    <p>
                      {interview.automation?.emailStatus === 'SMTP_ACCEPTED'
                        ? 'Thư mời: Máy chủ email đã chấp nhận gửi.'
                        : interview.automation?.emailStatus === 'FAILED'
                          ? 'Thư mời: Gửi thất bại, cần kiểm tra workflow.'
                          : ['PENDING', 'RUNNING'].includes(interview.automation?.status || '')
                            ? 'Thư mời: Đang chờ workflow.'
                            : 'Thư mời: Chưa xác nhận gửi.'}
                    </p>
                    {interview.automation?.emailStatus === 'SMTP_ACCEPTED' && (
                      <p>Người nhận cần kiểm tra Hộp thư đến hoặc thư rác.</p>
                    )}
                    {interview.automation?.emailStatus === 'UNKNOWN' && (
                      <p className="text-amber-800">
                        Workflow gửi thư gặp lỗi. Cần kiểm tra execution và hộp thư trước khi gửi
                        lại.
                      </p>
                    )}
                    {interview.automation?.status === 'UNKNOWN' && (
                      <p className="text-amber-800">
                        Chưa nhận đủ kết quả sau 10 phút. Kiểm tra execution trước khi gửi lại để
                        tránh thư trùng.
                      </p>
                    )}
                    {interview.automation?.failureStage === 'DISPATCH' && (
                      <p className="text-amber-800">
                        Không gửi được yêu cầu tới workflow. Lịch vẫn được lưu.
                      </p>
                    )}
                  </div>
                  {interview.feedback && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">{interview.feedback}</p>
                  )}
                  {interview.questions.length > 0 && (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                      {interview.questions.map((q, index) => (
                        <li key={index}>{q}</li>
                      ))}
                    </ol>
                  )}
                  {canManageInterview(interview.result, candidate.status, operator) && (
                    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={secondaryClass}
                          disabled={busy}
                          onClick={() => {
                            setCancellingInterviewId(null);
                            if (reschedulingInterviewId === interview.id) {
                              setReschedulingInterviewId(null);
                            } else {
                              setReschedulingInterviewId(interview.id);
                              setRescheduleInterviewerId(String(interview.interviewerId));
                              setRescheduleAt(toDateTimeLocalInput(interview.scheduledAt));
                            }
                          }}
                        >
                          {reschedulingInterviewId === interview.id ? 'Đóng đổi lịch' : 'Đổi lịch'}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 shadow-sm transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={busy}
                          onClick={() => {
                            setReschedulingInterviewId(null);
                            setCancellingInterviewId(
                              cancellingInterviewId === interview.id ? null : interview.id,
                            );
                          }}
                        >
                          Hủy lịch
                        </button>
                      </div>
                      {reschedulingInterviewId === interview.id && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            act(async () => {
                              const res = await api.rescheduleInterview(interview.id, {
                                interviewerId: rescheduleInterviewerId
                                  ? Number(rescheduleInterviewerId)
                                  : undefined,
                                scheduledAt: new Date(rescheduleAt).toISOString(),
                              });
                              setReschedulingInterviewId(null);
                              return res.message;
                            });
                          }}
                          className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            Đổi lịch phỏng vấn Vòng {interview.round}
                          </p>
                          <fieldset disabled={busy} className="space-y-3">
                            <Field label="Người phỏng vấn">
                              <select
                                required
                                className={inputClass}
                                value={rescheduleInterviewerId}
                                onChange={(e) => setRescheduleInterviewerId(e.target.value)}
                              >
                                <option value="">Chọn người phỏng vấn</option>
                                {interviewers.map((person) => (
                                  <option key={person.id} value={person.id}>
                                    {person.fullName} · {person.jobTitle || 'Chưa có chức danh'} ·{' '}
                                    {person.role}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field
                              label={
                                'Thời gian mới (' +
                                Intl.DateTimeFormat().resolvedOptions().timeZone +
                                ')'
                              }
                            >
                              <input
                                required
                                type="datetime-local"
                                className={inputClass}
                                value={rescheduleAt}
                                onChange={(e) => setRescheduleAt(e.target.value)}
                              />
                            </Field>
                            <p className="text-xs text-slate-600">
                              Kiểm tra trùng giờ ±45 phút và gửi lại webhook n8n cập nhật Google
                              Meet / email mời.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button className={buttonClass} disabled={!interviewers.length}>
                                {busy ? 'Đang lưu...' : 'Lưu lịch mới'}
                              </button>
                              <button
                                type="button"
                                className={secondaryClass}
                                onClick={() => setReschedulingInterviewId(null)}
                              >
                                Hủy thao tác
                              </button>
                            </div>
                          </fieldset>
                        </form>
                      )}
                      {cancellingInterviewId === interview.id && (
                        <Alert>
                          <p className="font-semibold">
                            Xác nhận hủy lịch phỏng vấn Vòng {interview.round}?
                          </p>
                          <p className="mt-1">
                            {candidate.interviews.length === 1
                              ? 'Đây là vòng phỏng vấn duy nhất — hồ sơ sẽ tự động quay về trạng thái Mới nộp (APPLIED).'
                              : 'Khung giờ của người phỏng vấn sẽ được giải phóng ngay sau khi hủy.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={secondaryClass}
                              disabled={busy}
                              onClick={() => setCancellingInterviewId(null)}
                            >
                              Giữ nguyên lịch
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                              disabled={busy}
                              onClick={() =>
                                act(async () => {
                                  const res = await api.cancelInterview(interview.id);
                                  setCancellingInterviewId(null);
                                  return res.message;
                                })
                              }
                            >
                              {busy ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
                            </button>
                          </div>
                        </Alert>
                      )}
                    </div>
                  )}
                  {Number(interview.interviewerId) === Number(user?.id) && (
                    <button
                      className={secondaryClass + ' mt-3'}
                      disabled={
                        busy ||
                        !capabilities?.questions ||
                        !candidate.hasCvText ||
                        candidate.status !== 'INTERVIEWING' ||
                        interview.result !== 'PENDING'
                      }
                      onClick={() =>
                        act(async () => {
                          const result = await api.questions(interview.id);
                          setQuestionPreview(result.mode === 'MOCK' ? result.data : []);
                          return result.saved
                            ? 'Đã lưu bộ câu hỏi.'
                            : (result.mode === 'N8N' || result.mode === 'BACKEND')
                              ? 'Đã gửi yêu cầu cho n8n. Câu hỏi sẽ cập nhật tự động.'
                              : 'Câu hỏi MOCK chỉ để xem trước.';
                        })
                      }
                    >
                      Gợi ý câu hỏi AI
                    </button>
                  )}
                  {Number(interview.interviewerId) === Number(user?.id) &&
                    candidate.status === 'INTERVIEWING' &&
                    (interview.result === 'PENDING' || editingInterviewId === interview.id) && (
                      <ResultForm
                        key={interview.updatedAt}
                        interview={interview}
                        busy={busy}
                        cancel={interview.result !== 'PENDING' ? () => setEditingInterviewId(null) : undefined}
                        save={(input) =>
                          act(async () => {
                            const saved = await api.result(interview, input);
                            setCandidate(saved);
                            setEditingInterviewId(null);
                            return 'Đã lưu kết quả phỏng vấn.';
                          }, false)
                        }
                      />
                    )}
                  {Number(interview.interviewerId) === Number(user?.id) &&
                    candidate.status === 'INTERVIEWING' &&
                    interview.result !== 'PENDING' &&
                    editingInterviewId !== interview.id && (
                      <button
                        type="button"
                        className={secondaryClass + ' mt-3'}
                        disabled={busy}
                        onClick={() => setEditingInterviewId(interview.id)}
                      >
                        Chỉnh sửa kết quả
                      </button>
                    )}
                </article>
              ))}
              {questionPreview.length > 0 && (
                <Alert>
                  MOCK — chưa lưu:{' '}
                  <ol className="list-decimal pl-5">
                    {questionPreview.map((q, index) => (
                      <li key={index}>{q}</li>
                    ))}
                  </ol>
                </Alert>
              )}
            </section>
            {operator && <OfferPanel applicationId={id} jobTitle={candidate.jobTitle} canCreate={['INTERVIEWING', 'OFFERED'].includes(candidate.status) && candidate.interviews[0]?.result === 'PASSED'} statusChanged={setOfferStatus} changed={() => { act(async () => {}); }} />}
            {operator && !terminal && (
              <section className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap gap-2">

                  <button
                    className={secondaryClass}
                    disabled={busy}
                    onClick={() => {
                      setConfirmHire(false);
                      setConfirmReject(true);
                    }}
                  >
                    Từ chối hồ sơ
                  </button>
                  <button
                    className={buttonClass}
                    disabled={busy || !canHire}
                    onClick={() => {
                      setConfirmReject(false);
                      setConfirmHire(true);
                    }}
                  >
                    Tuyển ứng viên
                  </button>
                </div>
                {!capabilities?.hire && (
                  <p className="text-sm text-amber-800">
                    Bước nhận việc đang chờ tích hợp tạo tài khoản và nhiệm vụ onboarding. Bạn vẫn
                    có thể hoàn thành đánh giá và đề xuất nhận việc.
                  </p>
                )}
                {capabilities?.hire && !canHire && (
                  <p className="text-sm text-slate-500">
                    Chỉ tuyển hồ sơ đang phỏng vấn hoặc đã đề xuất, có vòng phỏng vấn mới nhất đạt.
                  </p>
                )}
                {confirmHire && canHire && (
                  <Alert>
                    <p className="font-semibold">Xác nhận tuyển {candidate.candidateName}?</p>
                    <p className="mt-2">
                      Hệ thống sẽ tạo tài khoản nhân viên và 5 nhiệm vụ onboarding, rồi chuyển hồ sơ
                      sang Đã nhận việc.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className={secondaryClass}
                        disabled={busy}
                        onClick={() => setConfirmHire(false)}
                      >
                        Hủy tuyển
                      </button>
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            const result = await api.hire(id);
                            setConfirmHire(false);
                            const emailNotice =
                              result.welcomeEmailStatus === 'FAILED'
                                ? ' Chưa khởi chạy được thư chào mừng; HR cần kiểm tra gửi thư.'
                                : result.welcomeEmailStatus === 'DISPATCHED_UNVERIFIED'
                                  ? ' Thư chào mừng đang chờ xác nhận.'
                                  : '';
                            return (
                              (result.alreadyHired
                                ? 'Hồ sơ đã nhận việc trước đó.'
                                : 'Đã nhận việc.') +
                              ' Mã nhân viên #' +
                              result.hiredUserId +
                              ' · ' +
                              result.onboardingTasksCount +
                              ' nhiệm vụ onboarding.' +
                              emailNotice
                            );
                          })
                        }
                      >
                        {busy ? 'Đang tuyển...' : 'Xác nhận tuyển'}
                      </button>
                    </div>
                  </Alert>
                )}
                {confirmReject && (
                  <Alert>
                    Từ chối hồ sơ sẽ kết thúc quy trình tuyển dụng này.{' '}
                    <div className="mt-3 flex gap-2">
                      <button
                        className={secondaryClass}
                        disabled={busy}
                        onClick={() => setConfirmReject(false)}
                      >
                        Hủy
                      </button>
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await api.state(candidate, 'REJECTED');
                            setConfirmReject(false);
                            return 'Đã từ chối hồ sơ.';
                          })
                        }
                      >
                        Xác nhận từ chối
                      </button>
                    </div>
                  </Alert>
                )}
              </section>
            )}
            {candidate.status === 'HIRED' && (
              <Alert success>
                <p className="font-semibold">Đã nhận việc</p>
                <p className="mt-1">
                  {candidate.hiredUserId
                    ? 'Đã liên kết tài khoản nhân viên #' +
                      candidate.hiredUserId +
                      '. Các nhiệm vụ hội nhập được bàn giao sang Workspace.'
                    : 'HR cần kiểm tra liên kết tài khoản nhân viên.'}
                </p>
              </Alert>
            )}
            {busy && (
              <p role="status" className="text-sm text-blue-700">
                Đang xử lý, vui lòng chờ...
              </p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
