import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { TeamBurnoutAlert } from '../types';
import { formatDateTime, getErrorMessage, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../utils';
import { MoodBadge } from './MoodBadge';

interface InterventionModalProps {
  alert: TeamBurnoutAlert;
  jobTitle?: string | null;
  /** Phần tử đã mở modal — focus được trả về khi hủy */
  returnFocusTo: HTMLElement | null;
  /** Reject khi API lỗi; resolve khi thành công (parent tự đóng modal). */
  onSubmit: (note: string | undefined) => Promise<void>;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const InterventionModal: React.FC<InterventionModalProps> = ({
  alert,
  jobTitle,
  returnFocusTo,
  onSubmit,
  onClose,
}) => {
  const titleId = useId();
  const noteId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Mở: transition nhẹ, khóa scroll nền, focus vào ô ghi chú; đóng: trả focus
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    textareaRef.current?.focus();

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus();
    };
  }, [returnFocusTo]);

  // Sau khi lỗi: trả focus về ô ghi chú (nút submit vừa bị disable nên focus đã rơi)
  useEffect(() => {
    if (error) textareaRef.current?.focus();
  }, [error]);

  const requestClose = useCallback(() => {
    if (submittingRef.current) return; // không đóng khi đang gửi
    onClose();
  }, [onClose]);

  // Escape + focus trap
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return; // chặn gửi trùng
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const trimmed = note.trim();
      // Ghi chú không bắt buộc: backend tự điền ghi chú mặc định khi để trống
      await onSubmit(trimmed ? trimmed : undefined);
      // thành công → parent unmount modal
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Không thể ghi nhận can thiệp. Vui lòng thử lại.');
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const feedback = alert.feedbackText?.trim();
  const createdAt = formatDateTime(alert.createdAt);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 transition-opacity duration-200 motion-reduce:transition-none sm:items-center sm:p-4 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl transition-all duration-200 motion-reduce:transition-none sm:max-w-lg sm:rounded-xl ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              Ghi nhận can thiệp 1-on-1
            </h2>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              aria-label="Đóng"
              className="-m-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Ngữ cảnh trước, nhập liệu sau */}
            <dl className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <dt className="sr-only">Nhân sự</dt>
                  <dd className="text-sm font-semibold text-slate-900">{alert.employeeName}</dd>
                  {jobTitle && <dd className="text-xs text-slate-500">{jobTitle}</dd>}
                </div>
                <div className="shrink-0">
                  <dt className="sr-only">Tâm trạng hiện tại</dt>
                  <dd><MoodBadge mood={alert.mood} /></dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Chia sẻ gần nhất</dt>
                <dd className="mt-1 max-h-32 overflow-y-auto whitespace-pre-line break-words text-sm text-slate-700">
                  {feedback ? `“${feedback}”` : <span className="italic text-slate-400">Chưa có chia sẻ</span>}
                </dd>
                {createdAt && <dd className="mt-1 text-xs text-slate-400">{createdAt}</dd>}
              </div>
            </dl>

            <div>
              <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium text-slate-900">
                Ghi chú can thiệp
              </label>
              <textarea
                id={noteId}
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                readOnly={isSubmitting}
                rows={4}
                placeholder="Ví dụ: Đã hẹn trao đổi 14h hôm nay để giảm tải task..."
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 read-only:bg-slate-50 read-only:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Không bắt buộc. Nếu để trống, hệ thống sẽ ghi nhận ghi chú mặc định.
              </p>
            </div>

            {error && (
              <div
                id={errorId}
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className={`${SECONDARY_BUTTON} min-h-[44px] sm:min-h-0`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={`${PRIMARY_BUTTON} min-h-[44px] sm:min-h-0`}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSubmitting ? 'Đang ghi nhận…' : 'Ghi nhận & đóng cảnh báo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};