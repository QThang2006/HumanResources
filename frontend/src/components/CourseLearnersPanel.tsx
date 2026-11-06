import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, RefreshCw, Search, Users } from 'lucide-react';
import type { TrainingAssignment, TrainingCourse, TrainingStatus } from '../api/training.api';

const statusLabels: Record<TrainingStatus, string> = {
  ASSIGNED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang học', COMPLETED: 'Hoàn thành',
};

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

interface Props {
  course: TrainingCourse;
  assignments: TrainingAssignment[];
  loading: boolean;
  error: string;
  onBack: () => void;
  onRetry: () => void;
  onManageProgress: () => void;
}

export function CourseLearnersPanel({ course, assignments, loading, error, onBack, onRetry, onManageProgress }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TrainingStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return assignments.filter(item =>
      (status === 'ALL' || item.status === status) &&
      (!query || [item.user.fullName, item.user.email, item.user.departmentName || '']
        .some(value => value.toLocaleLowerCase('vi').includes(query))),
    );
  }, [assignments, search, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const completed = assignments.filter(item => item.status === 'COMPLETED').length;
  const inProgress = assignments.filter(item => item.status === 'IN_PROGRESS').length;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="course-learners-heading">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
        <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Danh mục khóa học
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 id="course-learners-heading" ref={headingRef} tabIndex={-1} className="text-lg font-bold leading-7 text-slate-900 outline-none [overflow-wrap:anywhere]">{course.title}</h3>
            <p className="mt-1 text-sm text-slate-600">Danh sách nhân viên đã được gán khóa học</p>
          </div>
          <button type="button" onClick={onManageProgress} disabled={loading || Boolean(error) || assignments.length === 0} className="min-h-10 shrink-0 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:cursor-not-allowed disabled:opacity-50">Quản lý tiến độ</button>
        </div>
        {course.isArchived && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">Khóa học đã gỡ khỏi danh mục. Các lượt gán và tiến độ bên dưới vẫn được giữ nguyên; nhân viên đã được gán vẫn có thể tiếp tục học.</p>}
      </div>

      {loading ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 px-5 py-10 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Đang tải danh sách người học...</div>
      ) : error ? (
        <div role="alert" className="px-5 py-8 text-sm text-rose-700 sm:px-7">
          <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>
          <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"><RefreshCw className="h-4 w-4" aria-hidden="true" />Thử lại</button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="px-5 py-12 text-center"><Users className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-900">Chưa có nhân viên được gán khóa học này.</p></div>
      ) : (
        <>
          <div className="space-y-4 px-5 py-5 sm:px-7">
            <p className="text-sm text-slate-700">{assignments.length} người học · {completed} hoàn thành · {inProgress} đang học</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="course-learner-search" className="mb-1.5 block text-xs font-semibold text-slate-700">Tìm người học</label>
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" /><input id="course-learner-search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Tên, email hoặc phòng ban" className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20" /></div>
              </div>
              <div className="sm:w-48"><label htmlFor="course-learner-status" className="mb-1.5 block text-xs font-semibold text-slate-700">Trạng thái</label><select id="course-learner-status" value={status} onChange={event => { setStatus(event.target.value as TrainingStatus | 'ALL'); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            </div>
          </div>
          {filtered.length === 0 ? <p className="border-t border-slate-200 px-5 py-10 text-center text-sm text-slate-600">Không có người học phù hợp với bộ lọc.</p> : (
            <>
              <div className="overflow-x-auto border-t border-slate-200" role="region" aria-label="Bảng người học" tabIndex={0}>
                <table className="w-full min-w-[820px] text-left text-sm">
                  <caption className="sr-only">Người học được gán khóa {course.title}</caption>
                  <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Nhân viên', 'Phòng ban', 'Ngày gán', 'Hạn hoàn thành', 'Tiến độ', 'Trạng thái'].map(label => <th key={label} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-200">{visible.map(assignment => <tr key={assignment.id} className="align-top hover:bg-slate-50">
                    <td className="max-w-xs px-5 py-4 [overflow-wrap:anywhere]"><p className="font-semibold text-slate-900">{assignment.user.fullName}</p><p className="mt-1 text-xs text-slate-600">{assignment.user.email}</p>{assignment.user.isActive === false && <p className="mt-1 text-xs text-amber-800">Tài khoản ngừng hoạt động</p>}</td>
                    <td className="px-5 py-4 text-slate-600">{assignment.user.departmentName || 'Chưa cập nhật'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(assignment.createdAt, 'Chưa cập nhật')}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(assignment.dueAt, 'Chưa đặt hạn')}</td>
                    <td className="px-5 py-4 font-semibold tabular-nums text-slate-700">{Math.max(0, Math.min(100, assignment.progressPercent))}%</td>
                    <td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${assignment.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : assignment.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{statusLabels[assignment.status] || assignment.status}</span></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-600 sm:px-7">
                <p role="status">{(currentPage - 1) * 20 + 1}–{Math.min(currentPage * 20, filtered.length)} / {filtered.length} người học</p>
                {pageCount > 1 && <div className="flex items-center gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-40">Trước</button><span>Trang {currentPage}/{pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-40">Sau</button></div>}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
