import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';
import type { TrainingCourse, TrainingCourseType, TrainingCourseUpdate } from '../api/training.api';

interface Props {
  course: TrainingCourse;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (data: TrainingCourseUpdate) => void;
}

const inputClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600';

export function CourseEditDialog({ course, busy, error, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(course.title);
  const [type, setType] = useState(course.type);
  const [skills, setSkills] = useState(course.skillsProvided.join(', '));
  const [url, setUrl] = useState(course.courseUrl ?? '');
  const [duration, setDuration] = useState(String(course.durationHours));
  const [validationError, setValidationError] = useState('');
  const locked = course.assignmentCount > 0;

  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const skillList = [...new Set(skills.split(',').map(skill => skill.trim()).filter(Boolean))];
    const hours = Number(duration);
    if (!title.trim() || title.trim().length > 255) return setValidationError('Tên khóa học phải có từ 1 đến 255 ký tự.');
    if (!Number.isInteger(hours) || hours < 1 || hours > 2147483647) return setValidationError('Thời lượng phải là số giờ nguyên lớn hơn 0.');
    if (!locked && !skillList.length) return setValidationError('Vui lòng nhập ít nhất một kỹ năng.');
    if (url.trim()) {
      try {
        if (url.trim().length > 500 || !['http:', 'https:'].includes(new URL(url.trim()).protocol)) throw Error();
      } catch { return setValidationError('Đường dẫn khóa học phải là URL http/https, tối đa 500 ký tự.'); }
    }
    setValidationError('');
    onConfirm({ title: title.trim(), courseUrl: url.trim() || null, durationHours: hours,
      ...(!locked ? { type, skillsProvided: skillList } : {}),
    });
  };

  return <dialog ref={ref} aria-labelledby="course-edit-title" aria-describedby="course-edit-notice"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    onClick={event => {
      if (event.target !== event.currentTarget || busy) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
    }}
    className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
    <form noValidate onSubmit={submit} aria-busy={busy}>
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h3 id="course-edit-title" className="flex items-center gap-2 text-lg font-semibold"><Pencil size={20} className="text-primary-600" aria-hidden="true" />Chỉnh sửa khóa học</h3>
        <button type="button" disabled={busy} onClick={onCancel} aria-label="Đóng chỉnh sửa khóa học" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="space-y-4 p-6">
        <p id="course-edit-notice" className={`rounded-lg border p-3 text-sm leading-6 ${locked ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-primary-200 bg-primary-50 text-primary-700'}`}>
          {locked ? `Khóa học có ${course.assignmentCount} lượt gán. Thông tin cập nhật sẽ hiển thị cho người học; tiến độ, hạn và kết quả được giữ nguyên. Phân loại và kỹ năng không thể thay đổi.`
            : 'Khóa học chưa được gán. Bạn có thể chỉnh sửa toàn bộ thông tin. Việc lưu không tự tạo lượt gán mới.'}
        </p>
        <label className="block"><span className="mb-2 block text-sm font-medium">Tên khóa học</span>
          <input autoFocus required maxLength={255} disabled={busy} value={title} onChange={event => setTitle(event.target.value)} className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-medium">Phân loại</span>
            <select disabled={busy || locked} aria-describedby={locked ? 'course-edit-locked' : undefined} value={type} onChange={event => setType(event.target.value as TrainingCourseType)} className={inputClass}>
              <option value="MANDATORY">Bắt buộc</option><option value="AI_SKILL_GAP">AI đề xuất</option><option value="SOFT_SKILL">Kỹ năng mềm</option>
            </select>
          </label>
          <label className="block"><span className="mb-2 block text-sm font-medium">Thời lượng (giờ)</span>
            <input type="number" required min={1} max={2147483647} step={1} disabled={busy} value={duration} onChange={event => setDuration(event.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block"><span className="mb-2 block text-sm font-medium">Kỹ năng cung cấp</span>
          <textarea required disabled={busy || locked} aria-describedby={locked ? 'course-edit-locked' : 'course-edit-skills-help'} rows={3} value={skills} onChange={event => setSkills(event.target.value)} className={`${inputClass} h-auto py-2`} />
        </label>
        {locked ? <p id="course-edit-locked" className="text-sm text-slate-600">Nếu phân loại hoặc nội dung kỹ năng thay đổi, hãy tạo khóa mới và gỡ khóa cũ để giữ lịch sử.</p>
          : <p id="course-edit-skills-help" className="text-sm text-slate-600">Phân cách các kỹ năng bằng dấu phẩy.</p>}
        <label className="block"><span className="mb-2 block text-sm font-medium">Đường dẫn tài liệu (không bắt buộc)</span>
          <input type="url" maxLength={500} disabled={busy} value={url} placeholder="https://…" onChange={event => setUrl(event.target.value)} className={inputClass} />
        </label>
        {(validationError || error) && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">{validationError || error}</p>}
      </div>
      <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button type="button" disabled={busy} onClick={onCancel} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-wait disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </footer>
    </form>
  </dialog>;
}
