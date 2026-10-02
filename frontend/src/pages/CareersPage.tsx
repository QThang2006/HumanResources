import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, DollarSign, MapPin } from 'lucide-react';
import { jobsApi } from '../api/jobs.api';
import type { JobFilters } from '../api/jobs.api';
import type { Job } from '../types';

type JobsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; jobs: Job[] };

type FiltersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; departments: JobFilters['departments'] };

export function CareersPage() {
  const [state, setState] = useState<JobsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [filters, setFilters] = useState<FiltersState>({ status: 'loading' });
  const [filtersAttempt, setFiltersAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    jobsApi.getFilters(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setFilters({ status: 'ready', departments: data.departments });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilters({ status: 'error' });
      });
    return () => controller.abort();
  }, [filtersAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => jobsApi.getAll(false, controller.signal, query.trim(), departmentId ? Number(departmentId) : undefined)
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
      }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, departmentId, attempt]);

  function search(value: string) {
    setQuery(value);
    setState({ status: 'loading' });
  }

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

      <section aria-label="Tìm kiếm vị trí tuyển dụng" className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <label htmlFor="job-search" className="mb-2 block text-sm font-semibold text-slate-700">Tìm theo tên công việc</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="job-search"
            type="search"
            maxLength={150}
            value={query}
            onChange={event => search(event.target.value)}
            placeholder="Ví dụ: Backend, Kế toán..."
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {query && <button type="button" onClick={() => search('')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Xóa tìm kiếm</button>}
        </div>
        <div className="mt-4">
          <label htmlFor="job-department" className="mb-2 block text-sm font-semibold text-slate-700">Phòng ban</label>
          <select
            id="job-department"
            value={departmentId}
            disabled={filters.status !== 'ready' || filters.departments.length === 0}
            onChange={event => { setDepartmentId(event.target.value); setState({ status: 'loading' }); }}
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 sm:max-w-sm"
          >
            <option value="">Tất cả phòng ban</option>
            {filters.status === 'ready' && filters.departments.map(department => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
          {filters.status === 'loading' && <p role="status" className="mt-2 text-sm text-slate-500">Đang tải phòng ban...</p>}
          {filters.status === 'ready' && filters.departments.length === 0 && <p className="mt-2 text-sm text-slate-500">Chưa có phòng ban đang tuyển.</p>}
          {filters.status === 'error' && (
            <div role="alert" className="mt-2 text-sm text-amber-800">
              <p>Không tải được danh sách phòng ban.</p>
              <button
                type="button"
                onClick={() => { setFilters({ status: 'loading' }); setFiltersAttempt(value => value + 1); }}
                className="mt-2 rounded-lg border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-50"
              >Thử lại phòng ban</button>
            </div>
          )}
        </div>
      </section>

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
            <p className="text-sm text-slate-600">{departmentId ? 'Không tìm thấy vị trí phù hợp với phòng ban và từ khóa đã chọn.' : query.trim() ? 'Không tìm thấy vị trí phù hợp với từ khóa.' : 'Hiện chưa có vị trí đang tuyển. Vui lòng quay lại sau.'}</p>
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
