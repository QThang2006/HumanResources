import React from 'react';
import { RotateCcw, Building2 } from 'lucide-react';
import type { DepartmentItem } from '../types';

interface TeamMoodHeaderProps {
  departmentName?: string;
  departmentId?: number;
  departments?: DepartmentItem[];
  onSelectDepartment?: (deptId: number) => void;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export const TeamMoodHeader: React.FC<TeamMoodHeaderProps> = ({
  departmentName,
  departmentId,
  departments,
  onSelectDepartment,
  lastUpdated,
  isRefreshing,
  isLoading,
  onRefresh,
}) => {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Team Mood
          </h2>
          {departments && departments.length > 0 ? (
            <div className="relative inline-flex items-center">
              <label htmlFor="team-mood-dept-select" className="sr-only">
                Lọc theo phòng ban
              </label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                <select
                  id="team-mood-dept-select"
                  value={departmentId ?? ''}
                  onChange={(e) => onSelectDepartment?.(Number(e.target.value))}
                  disabled={isRefreshing || isLoading}
                  className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : departmentName ? (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
              {departmentName}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Theo dõi nhịp năng lượng đội ngũ hôm nay theo từng ban
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        {formattedTime && (
          <span className="text-xs text-slate-400">
            Đã cập nhật {formattedTime}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          title="Làm mới dữ liệu Team Mood"
          aria-label="Làm mới dữ liệu"
        >
          <RotateCcw
            className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
        </button>
      </div>
    </div>
  );
};
