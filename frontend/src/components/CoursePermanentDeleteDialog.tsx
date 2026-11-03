import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { TrainingCourse } from '../api/training.api';

interface Props {
  course: TrainingCourse | null;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CoursePermanentDeleteDialog({ course, busy, error, onCancel, onConfirm }: Props) {
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
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="perm-delete-title"
      aria-describedby="perm-delete-description"
      onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
      onClick={event => { if (event.target === ref.current && !busy) onCancel(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-[#EDC7CC] bg-white p-0 text-[#303438] shadow-2xl backdrop:bg-black/40"
    >
      {course && (
        <div className="p-6">
          <div className="flex items-center gap-3 text-lg font-bold text-[#9D4150]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBF1F2] text-[#9D4150]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 id="perm-delete-title">Xóa vĩnh viễn khóa học?</h3>
          </div>

          <div id="perm-delete-description" className="mt-4 space-y-3 text-sm leading-6 text-[#636A70]">
            <p className="font-semibold text-[#1D2023] [overflow-wrap:anywhere]">{course.title}</p>
            <p className="rounded-xl border border-[#EDC7CC] bg-[#FBF1F2] p-3 text-xs font-semibold leading-5 text-[#9D4150]">
              Khóa học sẽ được xóa khỏi danh mục và mục Đã gỡ. Bạn không thể khôi phục khóa học sau thao tác này.
            </p>
            <p>
              {course.assignmentCount > 0
                ? `${course.assignmentCount} lượt học cùng tiến độ và kết quả vẫn được giữ trong hồ sơ nhân viên. Người đang học vẫn có thể tiếp tục học và cập nhật tiến độ.`
                : 'Khóa học này chưa có học viên nào được gán.'}
            </p>
          </div>

          {error && <p role="alert" className="mt-4 text-sm leading-6 text-[#9D4150]">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={onCancel}
              className="min-h-11 rounded-xl border border-[#D8DCDE] px-4 text-sm font-semibold hover:bg-[#F8F9F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#9D4150] px-4 text-sm font-semibold text-white hover:bg-[#843743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Xóa vĩnh viễn
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
