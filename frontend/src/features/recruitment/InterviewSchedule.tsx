import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  List,
  RefreshCw,
  Video,
} from 'lucide-react';
import { recruitmentApi as api } from './api';
import type { InterviewResult, InterviewScheduleQuery, Lookup, ScheduledInterview } from './types';
import { statusLabels } from './types';
import {
  calendarWindow,
  dateLabel,
  dayKey,
  periodLabel,
  safeMeetLink,
  shiftPeriod,
  shortDateLabel,
  timeLabel,
} from './calendar-date';
import type { CalendarPeriod } from './calendar-date';
import { Alert, Dialog, Field, buttonClass, errorText, inputClass, secondaryClass } from './ui';

const resultLabels: Record<InterviewResult, string> = {
  PENDING: 'Chờ phỏng vấn',
  PASSED: 'Đạt',
  FAILED: 'Chưa đạt',
};
const resultStyle: Record<InterviewResult, string> = {
  PENDING: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  PASSED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-900',
};
const weekdayLabels = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

async function loadPeriod(query: InterviewScheduleQuery, signal: AbortSignal) {
  const first = await api.interviewSchedule({ ...query, page: 1, pageSize: 100 }, signal);
  if (first.total > 1000)
    throw new Error(
      'Khoảng này có hơn 1.000 buổi phỏng vấn. Hãy chọn tuần hoặc lọc vị trí/người phỏng vấn để xem đầy đủ.',
    );
  const rows = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / 100); page++) {
    const next = await api.interviewSchedule({ ...query, page, pageSize: 100 }, signal);
    rows.push(...next.items);
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function ScheduleDetail({
  id,
  close,
  openCandidate,
}: {
  id: number;
  close: () => void;
  openCandidate: (id: number) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{
    revision: number;
    row: ScheduledInterview | null;
    error: string;
  }>({ revision: -1, row: null, error: '' });
  const loading = data.revision !== revision;
  const row = loading ? null : data.row;
  const error = loading ? '' : data.error;
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function refresh(initial = false) {
      if (running || controller.signal.aborted || (!initial && document.hidden)) return;
      running = true;
      try {
        const next = await api.scheduledInterview(id, controller.signal);
        if (!controller.signal.aborted) setData({ revision, row: next, error: '' });
      } catch (e) {
        if (!controller.signal.aborted) setData({ revision, row: null, error: errorText(e) });
      } finally {
        running = false;
      }
    }
    void refresh(true);
    const timer = setInterval(() => {
      void refresh();
    }, 15000);
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [id, revision]);
  const link = safeMeetLink(row?.meetingLink || null);
  return (
    <Dialog title="Chi tiết buổi phỏng vấn" close={close}>
      {loading ? (
        <p role="status">Đang tải buổi phỏng vấn...</p>
      ) : error ? (
        <Alert>
          {error}
          <button className={secondaryClass} onClick={() => setRevision((v) => v + 1)}>
            Thử lại
          </button>
        </Alert>
      ) : (
        row && (
          <div className="space-y-6">
            <div>
              <span
                className={
                  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold ' +
                  resultStyle[row.result]
                }
              >
                {resultLabels[row.result]}
              </span>
              <h3 className="mt-3 text-2xl font-bold text-slate-900">{row.candidateName}</h3>
              <p className="mt-1 break-words text-sm text-slate-500">{row.candidateEmail}</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="flex items-center gap-2 text-xl font-bold text-indigo-950">
                <Clock3 size={20} aria-hidden="true" />
                {timeLabel(row.scheduledAt)}
              </p>
              <p className="mt-1 text-sm capitalize text-slate-700">{dateLabel(row.scheduledAt)}</p>
              <p className="mt-1 text-xs text-slate-500">Giờ Việt Nam · UTC+7</p>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Vị trí tuyển dụng</dt>
                <dd className="mt-1 font-semibold">{row.jobTitle}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Người phỏng vấn</dt>
                <dd className="mt-1 font-semibold">{row.interviewerName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phòng ban</dt>
                <dd className="mt-1 font-semibold">{row.departmentName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Vòng & hồ sơ</dt>
                <dd className="mt-1 font-semibold">
                  Vòng {row.round} · {statusLabels[row.applicationStatus]}
                </dd>
              </div>
            </dl>
            <section
              aria-label="Phòng phỏng vấn"
              className="rounded-2xl border border-slate-200 p-4"
            >
              <h4 className="flex items-center gap-2 font-semibold">
                <Video size={18} aria-hidden="true" />
                Google Meet
              </h4>
              {link ? (
                <>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block break-all text-sm text-indigo-700 underline underline-offset-4"
                  >
                    {link}
                  </a>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass + ' mt-4'}
                  >
                    Vào phòng phỏng vấn
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Chưa có link Meet cho buổi này. Link sẽ hiển thị sau khi hệ thống tạo phòng và lưu
                  thành công.
                </p>
              )}
            </section>
            <div className="flex flex-wrap justify-between gap-3">
              <button className={secondaryClass} onClick={() => setRevision((v) => v + 1)}>
                <RefreshCw size={16} aria-hidden="true" />
                Cập nhật link
              </button>
              <button className={secondaryClass} onClick={() => openCandidate(row.applicationId)}>
                Xem hồ sơ ứng viên
              </button>
            </div>
          </div>
        )
      )}
    </Dialog>
  );
}

export function InterviewSchedule({ openCandidate }: { openCandidate: (id: number) => void }) {
  const [anchor, setAnchor] = useState(() => dayKey());
  const [period, setPeriod] = useState<CalendarPeriod>('week');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [jobId, setJobId] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [result, setResult] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<{ jobs: Lookup[]; interviewers: Lookup[] }>({
    jobs: [],
    interviewers: [],
  });
  const [filterError, setFilterError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const range = useMemo(() => calendarWindow(anchor, period), [anchor, period]);
  const queryKey = JSON.stringify([
    range.from,
    range.to,
    q,
    jobId,
    interviewerId,
    result,
    revision,
  ]);
  const [data, setData] = useState<{
    key: string;
    rows: ScheduledInterview[];
    error: string;
    refreshError: string;
  }>({ key: '', rows: [], error: '', refreshError: '' });
  const loading = data.key !== queryKey;
  const rows = useMemo(() => (loading ? [] : data.rows), [loading, data.rows]);
  const error = loading ? '' : data.error;
  const refreshError = loading ? '' : data.refreshError;
  const today = dayKey();
  useEffect(() => {
    const controller = new AbortController();
    api
      .interviewFilters(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setFilters(value);
          setFilterError('');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setFilterError(errorText(e));
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function refresh(initial = false) {
      if (running || controller.signal.aborted || (!initial && document.hidden)) return;
      running = true;
      try {
        const next = await loadPeriod(
          {
            from: range.from,
            to: range.to,
            q: q || undefined,
            jobId: jobId ? Number(jobId) : undefined,
            interviewerId: interviewerId ? Number(interviewerId) : undefined,
            result: (result || undefined) as InterviewResult | undefined,
          },
          controller.signal,
        );
        if (!controller.signal.aborted)
          setData({ key: queryKey, rows: next, error: '', refreshError: '' });
      } catch (e) {
        if (!controller.signal.aborted) {
          if (initial) setData({ key: queryKey, rows: [], error: errorText(e), refreshError: '' });
          else
            setData((current) =>
              current.key === queryKey
                ? { ...current, refreshError: 'Không cập nhật được lịch. ' + errorText(e) }
                : current,
            );
        }
      } finally {
        running = false;
      }
    }
    const debounce = setTimeout(() => {
      void refresh(true);
    }, 200);
    const timer = setInterval(() => {
      void refresh();
    }, 30000);
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      clearTimeout(debounce);
      clearInterval(timer);
      controller.abort();
      window.removeEventListener('focus', focus);
    };
  }, [range.from, range.to, q, jobId, interviewerId, result, revision, queryKey]);
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduledInterview[]>();
    for (const row of rows) {
      const key = dayKey(row.scheduledAt);
      map.set(key, [...(map.get(key) || []), row]);
    }
    return map;
  }, [rows]);
  const pending = rows.filter((row) => row.result === 'PENDING').length;
  return (
    <section aria-label="Lịch phỏng vấn" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lịch phỏng vấn</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi giờ hẹn và mở phòng Meet từ từng buổi phỏng vấn.
          </p>
        </div>
        <button
          className={secondaryClass}
          onClick={() => setRevision((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </button>
      </header>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Tìm ứng viên hoặc vị trí">
          <input
            className={inputClass}
            placeholder="Tên, email, vị trí..."
            maxLength={150}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
        <Field label="Vị trí tuyển dụng">
          <select className={inputClass} value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Tất cả vị trí</option>
            {filters.jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Người phỏng vấn">
          <select
            className={inputClass}
            value={interviewerId}
            onChange={(e) => setInterviewerId(e.target.value)}
          >
            <option value="">Tất cả người phỏng vấn</option>
            {filters.interviewers.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kết quả phỏng vấn">
          <select className={inputClass} value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="">Tất cả kết quả</option>
            {Object.entries(resultLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {filterError && (
        <Alert>
          Chưa tải được bộ lọc. {filterError}
          <button className={secondaryClass + ' ml-3'} onClick={() => setRevision((v) => v + 1)}>
            Thử lại
          </button>
        </Alert>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                aria-label="Khoảng trước"
                className={secondaryClass + ' !px-2'}
                onClick={() => setAnchor(shiftPeriod(anchor, period, -1))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button className={secondaryClass} onClick={() => setAnchor(today)}>
                Hôm nay
              </button>
              <button
                aria-label="Khoảng tiếp theo"
                className={secondaryClass + ' !px-2'}
                onClick={() => setAnchor(shiftPeriod(anchor, period, 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <h3 className="text-lg font-semibold capitalize">{periodLabel(anchor, period)}</h3>
            <input
              aria-label="Đi đến ngày"
              type="date"
              value={anchor}
              className={inputClass + ' !w-auto'}
              onChange={(e) => {
                if (e.target.value && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                  setAnchor(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div
              className="inline-flex rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Khoảng lịch"
            >
              {(['week', 'month'] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                  className={
                    'rounded-lg px-3 py-2 text-sm font-medium ' +
                    (period === value
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/70')
                  }
                >
                  {value === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
            <div
              className="inline-flex rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Cách xem phỏng vấn"
            >
              <button
                aria-pressed={view === 'calendar'}
                onClick={() => setView('calendar')}
                className={
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ' +
                  (view === 'calendar' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600')
                }
              >
                <CalendarDays size={16} aria-hidden="true" />
                Lịch
              </button>
              <button
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ' +
                  (view === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600')
                }
              >
                <List size={16} aria-hidden="true" />
                Danh sách
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
          <p role="status">
            {loading
              ? 'Đang tải lịch...'
              : `${rows.length} buổi · ${pending} đang chờ · ${rows.filter((row) => safeMeetLink(row.meetingLink)).length} có link Meet`}
          </p>
          <p>Giờ Việt Nam · UTC+7</p>
        </div>
        {refreshError && (
          <div className="p-4">
            <Alert>
              {refreshError}
              <button
                className={secondaryClass + ' ml-3'}
                onClick={() => setRevision((v) => v + 1)}
              >
                Tải lại
              </button>
            </Alert>
          </div>
        )}
        {error ? (
          <div className="p-6">
            <Alert>
              {error}
              <button
                className={secondaryClass + ' ml-3'}
                onClick={() => setRevision((v) => v + 1)}
              >
                Thử lại
              </button>
            </Alert>
          </div>
        ) : loading ? (
          <div className="grid min-h-[280px] place-items-center text-sm text-slate-500">
            Đang tải các buổi phỏng vấn...
          </div>
        ) : view === 'calendar' ? (
          <>
            <div
              className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 lg:max-h-[65vh] lg:overflow-auto"
              role="region"
              aria-label="Lịch phỏng vấn dạng lịch"
              tabIndex={0}
            >
              <div className="min-w-[900px]">
                <div className="grid grid-cols-7 border-b bg-slate-50">
                  {weekdayLabels.map((day) => (
                    <div
                      key={day}
                      className="px-3 py-3 text-center text-xs font-semibold text-slate-600"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {range.days.map((key) => {
                    const events = grouped.get(key) || [];
                    const limited = period === 'month' && !expanded.includes(key);
                    const visible = limited ? events.slice(0, 3) : events;
                    return (
                      <section
                        key={key}
                        aria-label={dateLabel(key + 'T12:00:00+07:00')}
                        className={
                          'min-h-[148px] border-b border-r border-slate-100 p-2 ' +
                          (period === 'week' ? 'min-h-[350px] ' : '') +
                          (key === today
                            ? 'bg-indigo-50/35'
                            : period === 'month' && key.slice(0, 7) !== anchor.slice(0, 7)
                              ? 'bg-slate-50'
                              : '')
                        }
                      >
                        <div className="mb-3 flex items-center justify-between px-1">
                          <span
                            aria-current={key === today ? 'date' : undefined}
                            className={
                              'inline-flex h-8 min-w-8 items-center justify-center rounded-full text-sm font-semibold ' +
                              (key === today ? 'bg-indigo-600 text-white' : 'text-slate-600')
                            }
                          >
                            {period === 'month' ? Number(key.slice(8)) : shortDateLabel(key)}
                          </span>
                          {events.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              {events.length} buổi
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {visible.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => setSelectedId(row.id)}
                              aria-label={`${row.candidateName}, ${timeLabel(row.scheduledAt)}, ${shortDateLabel(key)}, vòng ${row.round}`}
                              className={
                                'block w-full rounded-lg border p-2.5 text-left outline-offset-2 hover:shadow-sm focus-visible:outline-indigo-600 ' +
                                resultStyle[row.result]
                              }
                            >
                              <span className="flex items-center justify-between gap-1 text-xs font-bold">
                                <span>{timeLabel(row.scheduledAt)}</span>
                                {safeMeetLink(row.meetingLink) && (
                                  <Video size={13} aria-label="Có link Meet" />
                                )}
                              </span>
                              <span className="mt-1 block break-words text-xs font-semibold">
                                {row.candidateName}
                              </span>
                              <span
                                className="mt-1 block truncate text-[11px] opacity-75"
                                title={row.jobTitle}
                              >
                                {row.jobTitle}
                              </span>
                              <span className="mt-1 block text-[10px] opacity-75">
                                Vòng {row.round} · {resultLabels[row.result]}
                              </span>
                            </button>
                          ))}
                        </div>
                        {limited && events.length > 3 && (
                          <button
                            className="mt-2 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            onClick={() => setExpanded((current) => [...current, key])}
                          >
                            Xem thêm {events.length - 3} buổi
                          </button>
                        )}
                        {!events.length && period === 'week' && (
                          <p className="py-6 text-center text-xs text-slate-400">Chưa có lịch</p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="px-4 py-3 text-xs text-slate-500">
              Bấm vào một buổi để xem link Meet và hồ sơ. Trên điện thoại, vuốt ngang để xem đủ các
              ngày.
            </p>
          </>
        ) : rows.length ? (
          <div
            className="divide-y divide-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 lg:max-h-[65vh] lg:overflow-y-auto"
            role="region"
            aria-label="Danh sách lịch phỏng vấn"
            tabIndex={0}
          >
            {range.days
              .filter((key) => grouped.has(key))
              .map((key) => (
                <section key={key} aria-label={'Danh sách ' + shortDateLabel(key)}>
                  <h4 className="flex items-center justify-between gap-2 bg-slate-50/70 px-5 py-3 text-sm font-semibold capitalize text-slate-700">
                    <span>
                      {dateLabel(key + 'T12:00:00+07:00')}
                      {key === today && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                          Hôm nay
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-normal normal-case text-slate-500">
                      {grouped.get(key)?.length} buổi
                    </span>
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {grouped.get(key)?.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-indigo-50/40 focus-visible:outline-indigo-600 sm:flex-nowrap"
                      >
                        <span className="w-14 shrink-0 text-lg font-bold tabular-nums text-slate-900">
                          {timeLabel(row.scheduledAt)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold text-slate-900">
                            {row.candidateName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.jobTitle} · Vòng {row.round}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{row.interviewerName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={
                              'rounded-full border px-2.5 py-1 text-xs font-medium ' +
                              resultStyle[row.result]
                            }
                          >
                            {resultLabels[row.result]}
                          </span>
                          <span
                            className={
                              'inline-flex items-center gap-1 text-xs ' +
                              (safeMeetLink(row.meetingLink) ? 'text-indigo-700' : 'text-slate-400')
                            }
                          >
                            <Video size={15} aria-hidden="true" />
                            {safeMeetLink(row.meetingLink) ? 'Xem link Meet' : 'Chưa có link'}
                          </span>
                          <ChevronRight size={18} aria-hidden="true" className="text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        ) : (
          <div className="grid min-h-[280px] place-items-center p-8 text-center">
            <div>
              <CalendarDays className="mx-auto text-slate-300" size={36} aria-hidden="true" />
              <h4 className="mt-3 font-semibold text-slate-700">Chưa có buổi phỏng vấn phù hợp</h4>
              <p className="mt-1 text-sm text-slate-500">
                Chọn khoảng thời gian khác hoặc bỏ bớt bộ lọc.
              </p>
            </div>
          </div>
        )}
      </div>
      {selectedId !== null && (
        <ScheduleDetail
          key={selectedId}
          id={selectedId}
          close={() => setSelectedId(null)}
          openCandidate={(id) => {
            setSelectedId(null);
            openCandidate(id);
          }}
        />
      )}
    </section>
  );
}
