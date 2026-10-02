import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, DollarSign, MapPin } from 'lucide-react';
import { jobsApi } from '../api/jobs.api';
import type { Job } from '../types';

type JobsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; jobs: Job[] };

export function CareersPage() {
  const [state, setState] = useState<JobsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    jobsApi.getAll(false, controller.signal)
      .then(jobs => {
        if (!controller.signal.aborted) setState({ status: 'ready', jobs });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được danh sách tuyển dụng.',
          });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt(value => value + 1);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Cơ Hội Nghề Nghiệp Tại Công Ty
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Khám phá các vị trí đang tuyển và tìm cơ hội phù hợp với bạn.
        </p>
      </header>

      {state.status === 'loading' && (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Đang tải vị trí tuyển dụng...
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-900">{state.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-indigo-600"
          >
            Thử lại
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        state.jobs.length === 0 ? (
          <div role="status" className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <Briefcase aria-hidden="true" className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-slate-600">Hiện chưa có vị trí đang tuyển. Vui lòng quay lại sau.</p>
          </div>
        ) : (
          <section aria-label="Vị trí đang tuyển" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.jobs.map(job => (
              <article
                key={job.id}
                className="min-w-0 p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {job.departmentName}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Đang mở tuyển
                    </span>
                  </div>
                  <h2 className="break-words text-lg font-bold text-slate-900 hover:text-indigo-600">
                    <Link to={'/careers/' + job.id}>{job.title}</Link>
                  </h2>
                  <p className="break-words whitespace-pre-line text-sm text-slate-600 mt-2 line-clamp-2">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {job.salaryRange}
                    </span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    to={'/careers/' + job.id}
                    className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    aria-label={'Xem chi tiết: ' + job.title}
                  >
                    Xem chi tiết <ArrowRight aria-hidden="true" className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )
      )}
    </div>
  );
}
