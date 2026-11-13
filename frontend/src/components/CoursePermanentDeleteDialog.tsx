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
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl border border-rose-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/40"
    >
      {course && (
        <div className="p-6">
          <div className="flex items-center gap-3 text-lg font-bold text-rose-700">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 id="perm-delete-title">Xóa vĩnh viễn khóa học?</h3>
          </div>

          <div id="perm-delete-description" className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-900 [overflow-wrap:anywhere]">{course.title}</p>
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700">
              Khóa học sẽ được xóa khỏi danh mục và mục Đã gỡ. Bạn không thể khôi phục khóa học sau thao tác này.
            </p>
            <p>
              {course.assignmentCount > 0
                ? `${course.assignmentCount} lượt học cùng tiến độ và kết quả vẫn được giữ trong hồ sơ nhân viên. Người đang học vẫn có thể tiếp tục học và cập nhật tiến độ.`
                : 'Khóa học này chưa có học viên nào được gán.'}
            </p>
          </div>

          {error && <p role="alert" className="mt-4 text-sm leading-6 text-rose-700">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={onCancel}
              className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
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
