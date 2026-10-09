import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { recruitmentApi as api } from '../features/recruitment/api';
import type { Job } from '../features/recruitment/types';
import {
  Alert,
  Field,
  errorText,
  inputClass,
  buttonClass,
  secondaryClass,
} from '../features/recruitment/ui';

function JobDetail({ id }: { id: number }) {
  const [job, setJob] = useState<Job | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
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
      setFileError('Chọn PDF, PNG, JPG hoặc WEBP từ 1 byte đến 5 MiB.');
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
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link className="text-sm font-semibold text-indigo-700" to="/careers">
        ← Tất cả vị trí
      </Link>
      {loading ? (
        <p role="status" className="py-12">
          Đang tải thông tin...
        </p>
      ) : error ? (
        <div className="mt-6">
          <Alert>
            {error}{' '}
            <button className={secondaryClass} onClick={() => setAttempt((value) => value + 1)}>
              Thử lại
            </button>
          </Alert>
        </div>
      ) : (
        job && (
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
            <article className="min-w-0 break-words space-y-7 rounded-2xl border bg-white p-6 sm:p-8">
              <header>
                <p className="text-sm font-semibold text-indigo-600">{job.departmentName}</p>
                <h1 className="mt-2 text-3xl font-bold">{job.title}</h1>
                <p className="mt-4 text-slate-600">
                  {job.location} · {job.salaryRange || 'Lương thỏa thuận'}
                </p>
              </header>
              <section>
                <h2 className="mb-3 text-lg font-bold">Mô tả công việc</h2>
                <p className="whitespace-pre-wrap break-words text-slate-700">{job.description}</p>
              </section>
              <section>
                <h2 className="mb-3 text-lg font-bold">Yêu cầu ứng viên</h2>
                <p className="whitespace-pre-wrap break-words text-slate-700">{job.requirements}</p>
              </section>
            </article>
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-bold">Ứng tuyển vị trí này</h2>
              {receipt ? (
                <div className="space-y-4">
                  <Alert success>
                    {receipt.message} Mã hồ sơ: #{receipt.applicationId}.
                  </Alert>
                  {receipt.warning && <Alert>{receipt.warning}</Alert>}
                  <p className="text-sm text-slate-600">
                    Hồ sơ đã được gửi. Bạn không cần nộp lại.
                  </p>
                </div>
              ) : (
                <form key={id} onSubmit={submit} className="space-y-4">
                  <Field label="Họ và tên">
                    <input
                      name="candidateName"
                      autoComplete="name"
                      required
                      maxLength={150}
                      className={inputClass}
                      disabled={busy}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      name="candidateEmail"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={255}
                      className={inputClass}
                      disabled={busy}
                    />
                  </Field>
                  <Field label="Số điện thoại (không bắt buộc)">
                    <input
                      name="candidatePhone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={20}
                      className={inputClass}
                      disabled={busy}
                    />
                  </Field>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!busy) chooseFile(e.dataTransfer.files[0]);
                    }}
                    className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5"
                  >
                    <Field label="CV PDF hoặc ảnh · tối đa 5 MiB">
                      <input
                        ref={fileInput}
                        aria-describedby="cv-help"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                        disabled={busy}
                        onChange={(e) => chooseFile(e.target.files?.[0])}
                        className="block w-full text-sm"
                      />
                    </Field>
                    <p id="cv-help" className="mt-3 break-words text-xs text-slate-600">
                      {file
                        ? file.name + ' · ' + Math.ceil(file.size / 1024) + ' KB'
                        : 'Kéo thả hoặc chọn file. AI có thể đọc PDF có chữ, PDF scan và ảnh CV.'}
                    </p>
                    {file && (
                      <button
                        type="button"
                        className="mt-3 text-sm font-semibold text-indigo-700"
                        disabled={busy}
                        onClick={() => {
                          chooseFile();
                          if (fileInput.current) fileInput.current.value = '';
                        }}
                      >
                        Bỏ CV đã chọn
                      </button>
                    )}
                  </div>
                  {fileError && <Alert>{fileError}</Alert>}
                  {submitError && <Alert>{submitError}</Alert>}
                  <p className="text-xs text-slate-500">
                    Thông tin liên hệ và CV được gửi cho bộ phận tuyển dụng của vị trí này.
                  </p>
                  <button className={buttonClass + ' w-full'} disabled={busy || !file}>
                    {busy ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ ứng tuyển'}
                  </button>
                </form>
              )}
            </section>
          </div>
        )
      )}
    </main>
  );
}

export function JobDetailPage() {
  const { id } = useParams();
  if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <Link to="/careers" className="text-indigo-700">
          Tất cả vị trí
        </Link>
        <Alert>Mã vị trí không hợp lệ.</Alert>
      </main>
    );
  }
  return <JobDetail key={id} id={Number(id)} />;
}
