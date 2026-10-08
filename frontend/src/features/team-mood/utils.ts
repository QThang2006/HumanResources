import { Sun, CloudSun, CloudRain } from 'lucide-react';
import type { TeamMoodResponse, TeamMoodType } from './types';

export const MOOD_ORDER: readonly TeamMoodType[] = ['GREAT', 'NORMAL', 'STRESSED'] as const;

export const MOOD_META: Record<
  TeamMoodType,
  {
    label: string;
    icon: typeof Sun;
    iconColor: string;
    bar: string;
    bg: string;
    border: string;
    text: string;
  }
> = {
  GREAT: {
    label: 'Tuyệt vời',
    icon: Sun,
    iconColor: 'text-emerald-500',
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  NORMAL: {
    label: 'Bình thường',
    icon: CloudSun,
    iconColor: 'text-amber-500',
    bar: 'bg-amber-400',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  STRESSED: {
    label: 'Căng thẳng',
    icon: CloudRain,
    iconColor: 'text-rose-500',
    bar: 'bg-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
  },
};

export const toPercent = (count: number, total: number): number => {
  if (!total || total <= 0) return 0;
  return Math.round((count / total) * 100);
};

export const formatDateTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

export const getErrorMessage = (err: unknown): string => {
  if (!err) return 'Đã xảy ra lỗi không xác định.';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return 'Không thể kết nối đến máy chủ.';
};

export const normalizeTeamMood = (raw?: Partial<TeamMoodResponse>): TeamMoodResponse => {
  return {
    departmentName: raw?.departmentName || 'Phòng ban',
    managerId: raw?.managerId ?? 0,
    totalMembers: raw?.totalMembers ?? 0,
    checkedInCount: raw?.checkedInCount ?? 0,
    stats: {
      great: raw?.stats?.great ?? 0,
      normal: raw?.stats?.normal ?? 0,
      stressed: raw?.stats?.stressed ?? 0,
    },
    teamOverview: Array.isArray(raw?.teamOverview) ? raw.teamOverview : [],
    burnoutAlerts: Array.isArray(raw?.burnoutAlerts) ? raw.burnoutAlerts : [],
  };
};

export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-150';

export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-150';
