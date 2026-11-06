import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MapPin,
  Search,
  Building2,
  Sparkles,
  ShieldCheck,
  Award,
  GraduationCap,
  Clock,
  X,
  HeartHandshake,
  Laptop,
} from 'lucide-react';
import { jobsApi } from '../api/jobs.api';
import type { JobFilters, JobPage } from '../api/jobs.api';

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
    const targetElement = document.getElementById('jobs-section');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  function clearAllFilters() {
    setQuery('');
    setDepartmentId('');
    setLocation('');
    setPage(1);
    setState({ status: 'loading' });
  }

  const hasActiveFilters = Boolean(query.trim() || departmentId || location);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* ──────────────── HERO BANNER ──────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 border-b border-slate-200/80 pt-10 pb-14 lg:pt-14 lg:pb-16">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-700 shadow-xs mb-4">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span>Cổng thông tin tuyển dụng nhân tài 2026</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl max-w-3xl mx-auto leading-tight sm:leading-tight">
            Xây Dựng Sự Nghiệp Vững Vàng Cùng{' '}
            <span className="text-blue-600 underline decoration-blue-300 decoration-wavy decoration-2 underline-offset-8">
              TalentHunt
            </span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-600 font-normal">
            Khám phá các vị trí tuyển dụng hấp dẫn, môi trường làm việc cởi mở, lộ trình phát triển rõ ràng
            và chế độ đãi ngộ vượt trội cho những chuyên gia hàng đầu.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-4xl mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <div className="flex items-center justify-center text-blue-600 mb-1">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                {filters.status === 'ready' ? filters.departments.length : '4+'}
              </div>
              <div className="text-xs text-slate-500 font-medium">Khối phòng ban</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <div className="flex items-center justify-center text-emerald-600 mb-1">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-xl font-bold text-slate-900">100%</div>
              <div className="text-xs text-slate-500 font-medium">BHXH & Bảo hiểm VIP</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <div className="flex items-center justify-center text-amber-600 mb-1">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-xl font-bold text-slate-900">Lương x13+</div>
              <div className="text-xs text-slate-500 font-medium">Thưởng hiệu quả</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <div className="flex items-center justify-center text-blue-600 mb-1">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-xl font-bold text-slate-900">24-48h</div>
              <div className="text-xs text-slate-500 font-medium">Phản hồi hồ sơ AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── MAIN JOB SEARCH & LIST CONTENT ──────────────── */}
      <main id="jobs-section" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* SEARCH & FILTERS CONTAINER */}
        <section
          aria-label="Tìm kiếm và lọc cơ hội việc làm"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm mb-8"
        >
          <div className="flex flex-col gap-4">
            {/* Search Input Row */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                id="job-search"
                type="search"
                maxLength={150}
                value={query}
                onChange={(event) => search(event.target.value)}
                placeholder="Tìm kiếm vị trí theo chức danh, kỹ năng, công việc..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => search('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Department Select */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <select
                  id="job-department"
                  aria-label="Lọc theo phòng ban"
                  value={departmentId}
                  disabled={filters.status !== 'ready' || filters.departments.length === 0}
                  onChange={(event) => {
                    setDepartmentId(event.target.value);
                    setPage(1);
                    setState({ status: 'loading' });
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                >
                  <option value="">Tất cả phòng ban</option>
                  {filters.status === 'ready' &&
                    filters.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </div>
              </div>

              {/* Location Select */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <select
                  id="job-location"
                  aria-label="Lọc theo địa điểm làm việc"
                  value={location}
                  disabled={filters.status !== 'ready' || filters.locations.length === 0}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setPage(1);
                    setState({ status: 'loading' });
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                >
                  <option value="">Tất cả địa điểm</option>
                  {filters.status === 'ready' &&
                    filters.locations.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="flex items-center sm:col-span-2 lg:col-span-1">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 py-2.5 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              )}
            </div>

            {/* Filter loading / error status */}
            {filters.status === 'error' && (
              <div role="alert" className="text-xs text-rose-700 flex items-center gap-2 pt-1">
                <span>Không tải được danh mục bộ lọc.</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ status: 'loading' });
                    setFiltersAttempt((v) => v + 1);
                  }}
                  className="font-semibold underline hover:text-rose-900"
                >
                  Thử lại bộ lọc
                </button>
              </div>
            )}

            {/* Quick Department Filter Chips */}
            {filters.status === 'ready' && filters.departments.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                  Phòng ban:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentId('');
                    setPage(1);
                    setState({ status: 'loading' });
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    departmentId === ''
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({filters.departments.length})
                </button>
                {filters.departments.map((dept) => {
                  const isActive = departmentId === String(dept.id);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => {
                        setDepartmentId(isActive ? '' : String(dept.id));
                        setPage(1);
                        setState({ status: 'loading' });
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dept.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RESULTS HEADER & COUNTER */}
        {state.status === 'ready' && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <p className="font-medium text-slate-700">
                Tìm thấy <strong className="text-blue-600 font-bold text-base">{state.data.total}</strong> vị trí đang tuyển dụng
              </p>
              {hasActiveFilters && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                  Đang lọc kết quả
                </span>
              )}
            </div>
            {state.data.total > 0 && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Trang {state.data.page} / {Math.max(1, Math.ceil(state.data.total / state.data.pageSize))}
              </p>
            )}
          </div>
        )}

        {/* LOADING SKELETON STATE */}
        {state.status === 'loading' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-6 w-28 bg-slate-200 rounded-md"></div>
                  <div className="h-5 w-20 bg-slate-100 rounded-full"></div>
                </div>
                <div className="h-6 w-3/4 bg-slate-200 rounded-md"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 rounded"></div>
                  <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="h-4 w-24 bg-slate-100 rounded"></div>
                  <div className="h-4 w-28 bg-slate-100 rounded"></div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {state.status === 'error' && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50/80 p-8 text-center max-w-xl mx-auto shadow-xs my-8"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-rose-900 mb-1">Không thể tải dữ liệu tuyển dụng</h3>
            <p className="text-sm text-rose-700 leading-relaxed mb-4">{state.message}</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              Thử tải lại dữ liệu
            </button>
          </div>
        )}

        {/* READY STATE: EMPTY OR JOB CARDS */}
        {state.status === 'ready' &&
          (state.data.items.length === 0 ? (
            <div
              role="status"
              className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                <Briefcase className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa tìm thấy cơ hội việc làm phù hợp</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                {hasActiveFilters
                  ? 'Hiện không có vị trí nào khớp với từ khóa hoặc tiêu chí bộ lọc đã chọn. Hãy thử xóa bớt bộ lọc để xem các vị trí khác.'
                  : 'Hiện tại hệ thống đang cập nhật đợt tuyển dụng mới. Vui lòng quay lại sau.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
                >
                  Xóa bộ lọc & Xem tất cả ({state.data.total})
                </button>
              )}
            </div>
          ) : (
            <>
              {/* JOB GRID */}
              <section
                aria-label="Danh sách vị trí đang tuyển dụng"
                className="grid grid-cols-1 gap-6 md:grid-cols-2"
              >
                {state.data.items.map((job) => (
                  <article
                    key={job.id}
                    className="group relative flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-200"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-lg">
                          <Building2 className="h-3 w-3" />
                          {job.departmentName}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Đang nhận hồ sơ
                        </span>
                      </div>

                      {/* Job Title */}
                      <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        <Link to={'/careers/' + job.id} className="focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true"></span>
                          {job.title}
                        </Link>
                      </h2>

                      {/* Description Snippet */}
                      <p className="mt-2.5 text-sm text-slate-600 line-clamp-2 leading-relaxed break-words">
                        {job.description}
                      </p>

                      {/* Job Metadata Tags */}
                      <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {job.location || 'Hà Nội / Toàn quốc'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          {job.salaryRange || 'Lương thỏa thuận'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Toàn thời gian
                        </span>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Hồ sơ ứng tuyển AI hỗ trợ</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all">
                        Xem chi tiết & Nộp CV <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </article>
                ))}
              </section>

              {/* PAGINATION */}
              {state.data.total > state.data.pageSize && (
                <nav
                  aria-label="Phân trang vị trí tuyển dụng"
                  className="mt-10 flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-200/80"
                >
                  <button
                    type="button"
                    disabled={state.data.page <= 1}
                    onClick={() => changePage(state.data.page - 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" /> Trang trước
                  </button>

                  <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
                    Trang {state.data.page} / {Math.ceil(state.data.total / state.data.pageSize)}
                  </span>

                  <button
                    type="button"
                    disabled={state.data.page >= Math.ceil(state.data.total / state.data.pageSize)}
                    onClick={() => changePage(state.data.page + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                  >
                    Trang sau <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          ))}
      </main>

      {/* ──────────────── WHY JOIN US (CULTURE & PERKS) ──────────────── */}
      <section id="culture-section" className="border-t border-slate-200 bg-white py-14 mt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Quyền Lợi & Môi Trường
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Vì Sao Nên Phát Triển Sự Nghiệp Tại TalentHunt?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Chúng tôi coi con người là tài sản quý giá nhất, không ngừng xây dựng môi trường phát triển
              toàn diện và trao quyền tự chủ tối đa.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-xs hover:border-blue-300 hover:bg-white transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-4 shadow-xs">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Thu Nhập & Thưởng Vượt Trội</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Mức lương cạnh tranh, thưởng tháng 13+, thưởng hiệu quả dự án và cơ chế xét tăng lương 2 lần/năm rõ ràng.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-xs hover:border-emerald-300 hover:bg-white transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4 shadow-xs">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Chăm Sóc Sức Khỏe Toàn Diện</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Gói bảo hiểm sức khỏe cao cấp VIP, khám sức khỏe định kỳ hàng năm và đóng 100% BHXH theo lương thực tế.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-xs hover:border-amber-300 hover:bg-white transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 mb-4 shadow-xs">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Đào Tạo & Thăng Tiến Rõ Ràng</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Ngân sách học tập cá nhân, lộ trình thăng tiến công khai, có Mentor đồng hành sát sao trong 30 ngày thử việc.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-xs hover:border-blue-300 hover:bg-white transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-4 shadow-xs">
                <Laptop className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Trang Bị Hiện Đại & Linh Hoạt</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Trang bị laptop cấu hình cao, văn phòng mở tiện nghi với quầy pantry miễn phí, hỗ trợ chế độ làm việc linh hoạt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── 4-STEP RECRUITMENT PROCESS ──────────────── */}
      <section id="process-section" className="border-t border-slate-200 bg-slate-50/70 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Quy Trình Tuyển Dụng
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Hành Trình Gia Nhập Minh Bạch & Tinh Gọn
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Ứng dụng công nghệ AI tự động hóa giúp rút ngắn tối đa thời gian phản hồi và tôn trọng trải nghiệm ứng viên.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Nộp Hồ Sơ Ứng Tuyển</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chọn vị trí phù hợp và tải lên CV (PDF hoặc hình ảnh) chỉ trong 2 phút mà không cần tạo tài khoản rườm rà.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Sàng Lọc & Phản Hồi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đội ngũ Tuyển dụng & AI Copilot tiến hành đánh giá độ phù hợp và phản hồi kết quả hồ sơ trong 24-48 giờ làm việc.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Phỏng Vấn Chuyên Sâu</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gặp gỡ trực tiếp (hoặc trực tuyến qua Google Meet) cùng Trưởng bộ phận để trao đổi năng lực và định hướng công việc.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Nhận Offer & Onboarding</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhận thư mời làm việc chính thức và bắt đầu lộ trình hội nhập 30 ngày có Mentor đồng hành và AI Copilot hỗ trợ.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
