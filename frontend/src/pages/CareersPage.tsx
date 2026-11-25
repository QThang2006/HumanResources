import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Calendar, ChevronLeft, ChevronRight, DollarSign, MapPin, Users } from 'lucide-react';
import { jobsApi } from '../api/jobs.api';
import type { JobFilters, JobPage } from '../api/jobs.api';
import { daysUntilDeadline, formatDeadlineDate } from '../features/recruitment/job-deadline';

const PAGE_SIZE = 6;

type JobsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: JobPage };

type FiltersState =
  | { status: 'loading' }
  | { status: 'error' }
  | ({ status: 'ready' } & JobFilters);

export function CareersPage() {
  const [state, setState] = useState<JobsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersState>({ status: 'loading' });
  const [filtersAttempt, setFiltersAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    jobsApi
      .getFilters(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setFilters({ status: 'ready', departments: data.departments, locations: data.locations });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilters({ status: 'error' });
      });
    return () => controller.abort();
  }, [filtersAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        jobsApi
          .getPage(
            controller.signal,
            page,
            PAGE_SIZE,
            query.trim(),
            departmentId ? Number(departmentId) : undefined,
            location,
          )
          .then((data) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
            if (page > lastPage) {
              setState({ status: 'loading' });
              setPage(lastPage);
              return;
            }
            setState({ status: 'ready', data });
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted) {
              setState({
                status: 'error',
                message:
                  error instanceof Error ? error.message : 'Không tải được danh sách tuyển dụng.',
              });
            }
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, departmentId, location, page, attempt]);

  function search(value: string) {
    setQuery(value);
    setPage(1);
    setState({ status: 'loading' });
  }

  function changePage(value: number) {
    setPage(value);
    setState({ status: 'loading' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Cơ Hội Nghề Nghiệp Tại Công Ty
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Khám phá các vị trí đang tuyển và tìm cơ hội phù hợp với bạn.
        </p>
      </header>

      <section
        aria-label="Tìm kiếm vị trí tuyển dụng"
        className="mx-auto mb-6 max-w-7xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label htmlFor="job-search" className="mb-2 block text-sm font-semibold text-slate-700">
          Tìm theo tên công việc
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="job-search"
            type="search"
            maxLength={150}
            value={query}
            onChange={(event) => search(event.target.value)}
            placeholder="Ví dụ: Backend, Kế toán..."
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => search('')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="job-department"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Phòng ban
            </label>
            <select
              id="job-department"
              value={departmentId}
              disabled={filters.status !== 'ready' || filters.departments.length === 0}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setPage(1);
                setState({ status: 'loading' });
              }}
              className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Tất cả phòng ban</option>
              {filters.status === 'ready' &&
                filters.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
            </select>
            {filters.status === 'ready' && filters.departments.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">Chưa có phòng ban đang tuyển.</p>
            )}
          </div>
          <div className="min-w-0">
            <label
              htmlFor="job-location"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Địa điểm
            </label>
            <select
              id="job-location"
              value={location}
              disabled={filters.status !== 'ready' || filters.locations.length === 0}
              onChange={(event) => {
                setLocation(event.target.value);
                setPage(1);
                setState({ status: 'loading' });
              }}
              className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Tất cả địa điểm</option>
              {filters.status === 'ready' &&
                filters.locations.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
            {filters.status === 'ready' && filters.locations.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">Chưa có địa điểm đang tuyển.</p>
            )}
          </div>
        </div>
        <div>
          {filters.status === 'loading' && (
            <p role="status" className="mt-2 text-sm text-slate-500">
              Đang tải phòng ban và địa điểm...
            </p>
          )}
          {filters.status === 'error' && (
            <div role="alert" className="mt-2 text-sm text-amber-800">
              <p>Không tải được danh sách phòng ban và địa điểm.</p>
              <button
                type="button"
                onClick={() => {
                  setFilters({ status: 'loading' });
                  setFiltersAttempt((value) => value + 1);
                }}
                className="mt-2 rounded-lg border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-50"
              >
                Thử lại bộ lọc
              </button>
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
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
        >
          <p className="text-sm text-amber-900">{state.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-blue-600"
          >
            Thử lại
          </button>
        </div>
      )}

      {state.status === 'ready' &&
        (state.data.items.length === 0 ? (
          <div
            role="status"
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center"
          >
            <Briefcase aria-hidden="true" className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-slate-600">
              {departmentId || location
                ? 'Không tìm thấy vị trí phù hợp với bộ lọc đã chọn.'
                : query.trim()
                  ? 'Không tìm thấy vị trí phù hợp với từ khóa.'
                  : 'Hiện chưa có vị trí đang tuyển. Vui lòng quay lại sau.'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">{state.data.total}</strong> vị trí phù hợp
              </p>
              <p>
                Trang {state.data.page}/
                {Math.max(1, Math.ceil(state.data.total / state.data.pageSize))}
              </p>
            </div>
            <section
              aria-label="Vị trí đang tuyển"
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
              {state.data.items.map((job) => {
                const skillsArray = job.skills
                  ? job.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
                  : [];
                const remainingDays = daysUntilDeadline(job.deadline);
                const deadlineLabel = formatDeadlineDate(job.deadline);
                return (
                  <article
                    key={job.id}
                    className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            {job.departmentName}
                          </span>
                          {job.level && (
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {job.level}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {remainingDays !== null && remainingDays >= 0 && remainingDays <= 3 && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              {remainingDays === 0 ? 'Hết hạn hôm nay' : `Còn ${remainingDays} ngày`}
                            </span>
                          )}
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Đang mở tuyển
                          </span>
                        </div>
                      </div>
                      <h2 className="break-words text-lg font-bold text-slate-900 hover:text-blue-600">
                        <Link to={'/careers/' + job.id}>{job.title}</Link>
                      </h2>
                      <p className="break-words whitespace-pre-line text-sm text-slate-600 mt-2 line-clamp-2">
                        {job.description}
                      </p>

                      {skillsArray.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {skillsArray.map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0 text-slate-400"
                          />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0 text-slate-400"
                          />
                          {job.salaryRange}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0 text-slate-400"
                          />
                          Chỉ tiêu: {job.headcount ?? 1}
                        </span>
                        {job.employmentType && (
                          <span className="text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded">
                            {job.employmentType}
                          </span>
                        )}
                        {deadlineLabel && (
                          <span
                            className={
                              'flex items-center gap-1 ' +
                              (remainingDays !== null && remainingDays <= 3
                                ? 'font-semibold text-amber-700'
                                : 'text-slate-500')
                            }
                          >
                            <Calendar aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                            Hạn nộp: {deadlineLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">
                        {job.experienceYears ? `Kinh nghiệm: ${job.experienceYears}` : 'Tuyển dụng chính thức'}
                      </span>
                      <Link
                        to={'/careers/' + job.id}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                        aria-label={'Xem chi tiết: ' + job.title}
                      >
                        Xem chi tiết & Nộp CV <ArrowRight aria-hidden="true" className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </section>
            {state.data.total > state.data.pageSize && (
              <nav
                aria-label="Phân trang vị trí tuyển dụng"
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
              >
                <button
                  type="button"
                  disabled={state.data.page <= 1}
                  onClick={() => changePage(state.data.page - 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Trang trước
                </button>
                <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                  {state.data.page} / {Math.ceil(state.data.total / state.data.pageSize)}
                </span>
                <button
                  type="button"
                  disabled={state.data.page >= Math.ceil(state.data.total / state.data.pageSize)}
                  onClick={() => changePage(state.data.page + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang sau <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </nav>
            )}
          </>
        ))}
    </div>
  );
}
