import React from 'react';
import { AlertCircle, RotateCcw, Users } from 'lucide-react';

export const TeamMoodSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Đang tải dữ liệu Team Mood">
      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-1/3 rounded bg-slate-100" />
            <div className="mt-4 h-6 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Attention section skeleton */}
      <div className="h-32 rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-4 w-1/4 rounded bg-slate-100" />
        <div className="mt-4 h-12 w-full rounded bg-slate-50" />
      </div>

      {/* Table skeleton */}
      <div className="h-48 rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-4 w-1/3 rounded bg-slate-100" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-full rounded bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const TeamMoodEmptyState: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Users className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        Chưa có thành viên trong phòng ban
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Hiện chưa có dữ liệu thành viên để hiển thị. Vui lòng liên hệ HR nếu phòng ban chưa được gán nhân sự.
      </p>
    </div>
  );
};

interface TeamMoodErrorStateProps {
  detail?: string | null;
  isRetrying?: boolean;
  onRetry: () => void;
}

export const TeamMoodErrorState: React.FC<TeamMoodErrorStateProps> = ({
  detail,
  isRetrying,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-bold text-rose-900">
        Không thể tải dữ liệu đội ngũ
      </h3>
      <p className="mt-1 text-xs text-rose-700">
        {detail || 'Đã xảy ra lỗi khi kết nối máy chủ để lấy Team Mood.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 transition-colors"
      >
        <RotateCcw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>Thử lại</span>
      </button>
    </div>
  );
};
