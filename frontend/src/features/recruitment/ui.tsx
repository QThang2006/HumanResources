import { cloneElement, useEffect, useId, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 placeholder:text-slate-400';
export const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';
export const secondaryClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Không thực hiện được yêu cầu. Hãy thử lại.';
}
export function Alert({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return (
    <div
      role={success ? 'status' : 'alert'}
      className={
        'rounded-xl border p-4 text-sm ' +
        (success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-amber-200 bg-amber-50 text-amber-900')
      }
    >
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5 text-sm font-medium text-slate-700">
      <label className="block" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="w-[min(94vw,760px)] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-950/45"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Đóng hộp thoại"
          className={secondaryClass}
          onClick={close}
        >
          Đóng
        </button>
      </header>
      <div className="max-h-[78vh] overflow-auto p-6">{children}</div>
    </dialog>
  );
}
export function Pagination({
  page,
  total,
  pageSize,
  change,
}: {
  page: number;
  total: number;
  pageSize: number;
  change: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-slate-600"
    >
      <span>
        {total} kết quả · Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className={secondaryClass}
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          Trước
        </button>
        <button
          type="button"
          className={secondaryClass}
          disabled={page * pageSize >= total}
          onClick={() => change(page + 1)}
        >
          Tiếp
        </button>
      </div>
    </nav>
  );
}
