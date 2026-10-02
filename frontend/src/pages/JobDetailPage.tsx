import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, MapPin } from 'lucide-react';
import { jobsApi } from '../api/jobs.api';
import type { Job } from '../types';

type JobState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; job: Job };

function JobDetail({ id }: { id: number }) {
  const [state, setState] = useState<JobState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    jobsApi.getById(id, controller.signal)
      .then(job => {
        if (!controller.signal.aborted) setState({ status: 'ready', job });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được thông tin vị trí.',
          });
        }
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (state.status === 'loading') {
    return <p role="status" className="py-12 text-center text-sm text-slate-500">Đang tải thông tin vị trí...</p>;
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm text-amber-900">{state.message}</p>
        <p className="mt-2 text-sm text-slate-600">Tin có thể đã đóng tuyển hoặc không còn tồn tại.</p>
        <button
          type="button"
          onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1); }}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { job } = state;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <article className="min-w-0 lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {job.departmentName}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Đang mở tuyển
            </span>
          </div>
          <h1 className="break-words text-2xl font-black text-slate-900 tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500 pb-6 border-b border-slate-100">
            <span className="flex items-center gap-1">
              <MapPin aria-hidden="true" className="w-4 h-4 shrink-0" /> {job.location}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign aria-hidden="true" className="w-4 h-4 shrink-0" /> {job.salaryRange}
            </span>
          </div>
        </header>
        <section className="mt-6">
          <h2 className="text-base font-bold text-slate-900 mb-2">Mô tả công việc</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">{job.description}</p>
        </section>
        <section className="mt-6">
          <h2 className="text-base font-bold text-slate-900 mb-2">Yêu cầu ứng viên</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">{job.requirements}</p>
        </section>
      </article>
      <aside className="self-start rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-bold text-slate-900">Ứng tuyển</h2>
        <p className="mt-2 text-sm text-slate-600">
          Chức năng gửi hồ sơ trực tuyến chưa mở. Vui lòng quay lại sau.
        </p>
      </aside>
    </div>
  );
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const validId = Boolean(id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/careers" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft aria-hidden="true" className="w-4 h-4" /> Quay lại Cổng việc làm
      </Link>
      {validId
        ? <JobDetail key={id} id={Number(id)} />
        : <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Mã vị trí tuyển dụng không hợp lệ.</p>}
    </div>
  );
}
