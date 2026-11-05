import { useEffect, useRef } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { TrainingCourse } from '../api/training.api';

interface Props {
  course: TrainingCourse | null;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CourseRemoveDialog({ course, busy, error, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (course && !dialog.open) dialog.showModal();
    if (!course && dialog.open) dialog.close();
    if (!course) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [course]);

  return (
    <dialog ref={ref} role="alertdialog" aria-labelledby="remove-course-title" aria-describedby="remove-course-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }} onClick={event => { if (event.target === ref.current && !busy) onCancel(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-[#D8DCDE] bg-white p-0 text-[#303438] shadow-xl backdrop:bg-black/40">
      {course && <div className="p-6">
        <h3 id="remove-course-title" className="flex items-center gap-3 text-lg font-bold"><Trash2 className="h-5 w-5 shrink-0 text-[#9D4150]" aria-hidden="true" />Gỡ khóa học khỏi danh mục?</h3>
        <div id="remove-course-description" className="mt-4 space-y-3 text-sm leading-6 text-[#636A70]">
          <p className="font-semibold text-[#303438] [overflow-wrap:anywhere]">{course.title}</p>
          <p>Khóa học sẽ chuyển sang mục “Đã gỡ” và không được gán mới hoặc đề xuất bởi AI.</p>
          <p>{course.assignmentCount > 0 ? `${course.assignmentCount} lượt gán cùng toàn bộ tiến độ học tập vẫn được giữ nguyên. Người đã được gán vẫn có thể tiếp tục học.` : 'Chưa có người học được gán khóa này.'} Bạn có thể khôi phục khóa học sau.</p>
        </div>
        {error && <p role="alert" className="mt-4 text-sm leading-6 text-[#9D4150]">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-[#D8DCDE] px-4 text-sm font-semibold hover:bg-[#F8F9F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] disabled:opacity-50">Giữ lại</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#9D4150] px-4 text-sm font-semibold text-white hover:bg-[#843743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{busy ? 'Đang gỡ...' : 'Gỡ khóa học'}</button>
        </div>
      </div>}
    </dialog>
  );
}
