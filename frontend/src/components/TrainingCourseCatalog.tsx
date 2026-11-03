import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Clock3, ExternalLink, Plus, Search, Users, X } from 'lucide-react';
import type { TrainingAssignment, TrainingCourse, TrainingCourseType } from '../api/training.api';
import './training-course-catalog.css';

const TYPE_LABELS: Record<TrainingCourseType, string> = {
  MANDATORY: 'Bắt buộc', AI_SKILL_GAP: 'AI đề xuất', SOFT_SKILL: 'Kỹ năng mềm',
};
const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const courseLink = (value: string | null) => {
  try {
    const url = new URL(value ?? '');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};

interface Props {
  courses: TrainingCourse[];
  assignments: TrainingAssignment[];
  showCreateCourse: boolean;
  onToggleCreate: () => void;
  onAssign: (course: TrainingCourse) => void;
  onTrack: (course: TrainingCourse) => void;
}

export function TrainingCourseCatalog({ courses, assignments, showCreateCourse, onToggleCreate, onAssign, onTrack }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('name');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailView, setDetailView] = useState<'overview' | 'employees'>('overview');
  const openDetail = (id: number, view: 'overview' | 'employees' = 'overview') => {
    setDetailView(view);
    setDetailId(id);
  };
  const detail = courses.find(course => course.id === detailId);
  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    return courses.filter(course => (filter === 'ALL' || course.type === filter) &&
      (!query || normalize([course.title, ...course.skillsProvided].join(' ')).includes(query)))
      .sort((a, b) => sort === 'duration' ? a.durationHours - b.durationHours || a.title.localeCompare(b.title, 'vi')
        : sort === 'assigned' ? b.assignmentCount - a.assignmentCount || a.title.localeCompare(b.title, 'vi')
          : a.title.localeCompare(b.title, 'vi'));
  }, [courses, search, filter, sort]);
  const reset = () => { setSearch(''); setFilter('ALL'); };

  return <section className="tv4-course-catalog" aria-labelledby="tv4-catalog-heading">
    <header className="tv4-catalog-heading">
      <div><h3 id="tv4-catalog-heading">Danh mục khóa học <span>{courses.length}</span></h3>
        <p>Chọn khóa học phù hợp cho lộ trình phát triển của đội ngũ.</p></div>
      <button type="button" className="tv4-primary" onClick={onToggleCreate} aria-expanded={showCreateCourse}>
        {showCreateCourse ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
        {showCreateCourse ? 'Đóng biểu mẫu' : 'Tạo khóa học'}
      </button>
    </header>
    <div className="tv4-catalog-toolbar">
      <div className="tv4-catalog-search"><Search size={18} aria-hidden="true" />
        <input aria-label="Tìm khóa học hoặc kỹ năng" placeholder="Tìm theo tên khóa học hoặc kỹ năng…" value={search} onChange={event => setSearch(event.target.value)} />
        {search && <button type="button" aria-label="Xóa từ khóa" onClick={() => setSearch('')}><X size={16} aria-hidden="true" /></button>}
      </div>
      <label>Phân loại<select value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="ALL">Tất cả loại khóa học</option>
        {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Sắp xếp<select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="name">Tên khóa học A–Z</option><option value="duration">Thời lượng tăng dần</option><option value="assigned">Nhiều lượt gán nhất</option>
      </select></label>
    </div>
    <div className="tv4-catalog-result" role="status">{filtered.length} khóa học{(search || filter !== 'ALL') && <> phù hợp <button type="button" onClick={reset}>Xóa bộ lọc</button></>}</div>
    {filtered.length ? <table className="tv4-catalog-table">
      <caption className="sr-only">Danh mục khóa học và thao tác gán đào tạo</caption>
      <thead><tr><th scope="col">Khóa học & kỹ năng</th><th scope="col">Phân loại</th><th scope="col">Thời lượng</th><th scope="col">Đào tạo</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
      <tbody>{filtered.map(course => <tr key={course.id}>
        <td className="tv4-catalog-name"><div className="tv4-course-identity"><span className="tv4-course-book"><BookOpen size={20} aria-hidden="true" /></span><div>
          <button type="button" onClick={() => openDetail(course.id)} aria-label={`Xem chi tiết khóa ${course.title}`}>{course.title}</button>
          <p>{course.skillsProvided.length ? course.skillsProvided.slice(0, 3).join(' · ') : 'Chưa bổ sung kỹ năng'}{course.skillsProvided.length > 3 && ` · +${course.skillsProvided.length - 3} kỹ năng`}</p>
        </div></div></td>
        <td data-label="Phân loại"><span className={`tv4-course-type is-${course.type.toLowerCase()}`}>{TYPE_LABELS[course.type]}</span></td>
        <td data-label="Thời lượng"><span className="tv4-course-duration"><Clock3 size={15} aria-hidden="true" />{course.durationHours} giờ</span></td>
        <td data-label="Đào tạo"><button type="button" className={`tv4-course-count ${course.assignmentCount ? '' : 'is-empty'}`} onClick={() => openDetail(course.id, 'employees')} aria-label={`Xem nhân viên được gán khóa ${course.title}`}>{course.assignmentCount ? `${course.assignmentCount} lượt gán` : 'Chưa gán'}</button></td>
        <td className="tv4-catalog-actions"><button type="button" className="tv4-catalog-detail" onClick={() => openDetail(course.id)} aria-label={`Chi tiết khóa ${course.title}`}>Chi tiết</button>
          <button type="button" className="tv4-catalog-assign" onClick={() => onAssign(course)} aria-label={`Gán khóa ${course.title}`}>Gán khóa <ArrowRight size={15} aria-hidden="true" /></button></td>
      </tr>)}</tbody>
    </table> : <div className="tv4-catalog-empty">
      {courses.length ? <Search size={28} aria-hidden="true" /> : <BookOpen size={28} aria-hidden="true" />}
      <h4>{courses.length ? 'Không tìm thấy khóa học phù hợp' : 'Bắt đầu xây dựng danh mục đào tạo'}</h4>
      <p>{courses.length ? 'Thử tên khóa học, kỹ năng khác hoặc bỏ bớt bộ lọc.' : 'Tạo khóa học đầu tiên để có thể gán và theo dõi việc học của nhân viên.'}</p>
      <button type="button" className="tv4-filter" onClick={courses.length ? reset : onToggleCreate}>{courses.length ? 'Xóa bộ lọc' : showCreateCourse ? 'Đóng biểu mẫu' : 'Tạo khóa học đầu tiên'}</button>
    </div>}
    {detail && <CourseDetail course={detail} assignments={assignments.filter(item => item.course.id === detail.id)} initialView={detailView} onClose={() => setDetailId(null)} onAssign={() => { setDetailId(null); onAssign(detail); }} onTrack={() => { setDetailId(null); onTrack(detail); }} />}
  </section>;
}

function CourseDetail({ course, assignments, initialView, onClose, onAssign, onTrack }: { course: TrainingCourse; assignments: TrainingAssignment[]; initialView: 'overview' | 'employees'; onClose: () => void; onAssign: () => void; onTrack: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(initialView);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const employees = assignments.filter(item => normalize(`${item.user.fullName} ${item.user.email}`).includes(normalize(employeeSearch.trim())));
  const statusLabels: Record<string, string> = { ASSIGNED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang học', COMPLETED: 'Hoàn thành' };
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  const link = courseLink(course.courseUrl);
  return <dialog ref={ref} className="tv4-course-drawer" aria-labelledby="tv4-course-detail-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <header><span>Chi tiết khóa học</span><button type="button" autoFocus aria-label="Đóng chi tiết khóa học" onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="tv4-course-drawer-body">
      <BookOpen className="tv4-drawer-book" size={30} aria-hidden="true" />
      <h3 id="tv4-course-detail-title">{course.title}</h3>
      <span className={`tv4-course-type is-${course.type.toLowerCase()}`}>{TYPE_LABELS[course.type]}</span>
      <div className="tv4-course-detail-views" role="group" aria-label="Nội dung chi tiết khóa học">
        <button type="button" aria-pressed={view === 'overview'} onClick={() => setView('overview')}>Thông tin khóa học</button>
        <button type="button" aria-pressed={view === 'employees'} onClick={() => setView('employees')}>Nhân viên được gán <span>{assignments.length}</span></button>
      </div>
      {view === 'overview' ? <>
      <dl><div><dt><Clock3 size={17} aria-hidden="true" />Thời lượng</dt><dd>{course.durationHours} giờ</dd></div><div><dt><Users size={17} aria-hidden="true" />Đã triển khai</dt><dd>{course.assignmentCount} lượt đào tạo</dd></div></dl>
      <h4>Kỹ năng cung cấp</h4><div className="tv4-drawer-skills">{course.skillsProvided.length ? course.skillsProvided.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>) : <p>Chưa bổ sung kỹ năng cho khóa học này.</p>}</div>
      <h4>Tài liệu học tập</h4>{link ? <a className="tv4-course-resource" href={link} target="_blank" rel="noopener noreferrer">Mở tài liệu khóa học <ExternalLink size={16} aria-hidden="true" /><span className="sr-only"> (mở trong thẻ mới)</span></a> : <p className="tv4-course-no-resource">Chưa có đường dẫn tài liệu học tập.</p>}
      </> : <section className="tv4-course-employees" aria-label="Nhân viên được gán khóa học">
        {assignments.length > 0 ? <>
          <p>Những nhân viên đã được gán khóa học này. Xem tiến độ và điều chỉnh tại màn hình theo dõi.</p>
          <div className="tv4-catalog-search"><Search size={17} aria-hidden="true" /><input aria-label="Tìm nhân viên trong khóa học" placeholder="Tìm tên hoặc email nhân viên…" value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} /></div>
          <p className="tv4-course-employee-result" role="status">{employees.length} nhân viên{employeeSearch.trim() ? ' phù hợp' : ''}</p>
          {employees.length ? <ul>{employees.map(item => <li key={item.id}>
            <div><strong>{item.user.fullName}</strong><span>{item.user.email}</span></div>
            <span className={`tv4-course-employee-status is-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span>
          </li>)}</ul> : <div className="tv4-course-employee-empty"><p>Không tìm thấy nhân viên phù hợp.</p><button type="button" onClick={() => setEmployeeSearch('')}>Xóa từ khóa</button></div>}
        </> : <div className="tv4-course-employee-empty"><Users size={28} aria-hidden="true" /><h4>Chưa có nhân viên được gán</h4><p>Gán khóa học để bắt đầu lộ trình đào tạo cho nhân viên.</p></div>}
      </section>}
    </div>
    <footer>{view === 'employees' && assignments.length > 0 ? <>
      <button type="button" className="tv4-primary" onClick={onTrack}>Theo dõi khóa học này <ArrowRight size={17} aria-hidden="true" /></button>
      <button type="button" className="tv4-course-assign-more" onClick={onAssign}><Plus size={16} aria-hidden="true" />Gán thêm nhân viên</button>
    </> : <><button type="button" className="tv4-primary" onClick={onAssign}>Gán khóa học này <ArrowRight size={17} aria-hidden="true" /></button><p>Chọn nhân viên và hạn hoàn thành ở bước tiếp theo.</p></>}</footer>
  </dialog>;
}
