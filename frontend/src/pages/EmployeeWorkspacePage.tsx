import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { onboardingApi } from '../api/onboarding.api';
import type { EmployeeMood, OnboardingTask, TaskCategory } from '../types';
import {
  Users,
  Bot,
  Activity,
  BookOpen,
  Sun,
  CloudSun,
  CloudRain,
  Check,
  Loader2,
  Clock,
  Heart,
  Code2,
  Calendar,
  Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// CẤU HÌNH MOOD — Weather Metaphor (tham khảo Officevibe & Winningtemp 2026)
// ─────────────────────────────────────────────────────────────────────
const MOOD_OPTIONS = [
  {
    value: 'GREAT' as const,
    label: 'Tuyệt Vời',
    subtitle: 'Năng lượng tốt',
    icon: Sun,
    gradient: 'from-emerald-400 to-teal-500',
    ring: 'ring-emerald-400/40',
    shadow: 'shadow-emerald-200/60',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    placeholder: 'Điều gì khiến bạn vui hôm nay? (không bắt buộc)',
  },
  {
    value: 'NORMAL' as const,
    label: 'Bình Thường',
    subtitle: 'Ổn định',
    icon: CloudSun,
    gradient: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-400/40',
    shadow: 'shadow-amber-200/60',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    placeholder: 'Bạn có muốn chia sẻ thêm không? (không bắt buộc)',
  },
  {
    value: 'STRESSED' as const,
    label: 'Căng Thẳng',
    subtitle: 'Cần hỗ trợ',
    icon: CloudRain,
    gradient: 'from-rose-400 to-pink-500',
    ring: 'ring-rose-400/40',
    shadow: 'shadow-rose-200/60',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-700',
    placeholder: 'Điều gì đang khiến bạn lo lắng? (không bắt buộc)',
  },
];

type MoodValue = 'GREAT' | 'NORMAL' | 'STRESSED';

// ─────────────────────────────────────────────────────────────────────
// CHECKLIST ONBOARDING 30 NGÀY — dữ liệu từ backend, optimistic toggle
// ─────────────────────────────────────────────────────────────────────
type CategoryFilter = TaskCategory | 'ALL';

interface ProgressSummary {
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
}

const EMPTY_PROGRESS: ProgressSummary = { progressPercent: 0, totalTasks: 0, completedTasks: 0 };

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PAPERWORK', label: 'Hành chính' },
  { value: 'EQUIPMENT', label: 'Thiết bị' },
  { value: 'TRAINING', label: 'Đào tạo' },
  { value: 'MEETING', label: 'Gặp gỡ' },
];

const CATEGORY_BADGE: Record<TaskCategory, { label: string; className: string }> = {
  PAPERWORK: { label: 'Hành chính', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  EQUIPMENT: { label: 'Thiết bị', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  TRAINING: { label: 'Đào tạo', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEETING: { label: 'Gặp gỡ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const calcProgressPercent = (completed: number, total: number) =>
  total === 0 ? 0 : Math.round((completed / total) * 100);

const SECONDARY_BUTTON_CLASS =
  'px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 ' +
  'hover:bg-slate-50 transition-colors duration-200 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

interface OnboardingTaskRowProps {
  task: OnboardingTask;
  isUpdating: boolean;
  onToggle: (task: OnboardingTask) => void;
}

const OnboardingTaskRow: React.FC<OnboardingTaskRowProps> = ({ task, isUpdating, onToggle }) => {
  const badge = CATEGORY_BADGE[task.category];

  return (
    <li>
      <label
        className={`group flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl
          transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50/50
          ${isUpdating ? 'cursor-wait' : 'cursor-pointer'}`}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={task.isCompleted}
          disabled={isUpdating}
          onChange={() => onToggle(task)}
          aria-label={`${task.isCompleted ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}: ${task.title}`}
        />
        {/* Checkbox dạng CSS — dấu tích vẽ bằng border, không dùng icon */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded-md border-2
            transition-colors duration-200
            peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2
            ${task.isCompleted
              ? 'bg-emerald-600 border-emerald-600'
              : 'bg-white border-slate-300 group-hover:border-indigo-500'
            }`}
        >
          {task.isCompleted && (
            <span className="block w-1.5 h-2.5 -mt-0.5 rotate-45 border-b-2 border-r-2 border-white" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold break-words ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p
              className={`mt-0.5 text-xs leading-relaxed break-words ${task.isCompleted ? 'text-slate-400' : 'text-slate-500'
                }`}
            >
              {task.description}
            </p>
          )}
          <span
            className={`mt-2 inline-block px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-slate-600">Ngày {task.dueDay}</p>
          <p
            className={`mt-0.5 text-[11px] ${task.isCompleted ? 'text-emerald-700 font-medium' : 'text-slate-400'
              }`}
          >
            {task.isCompleted ? 'Hoàn thành' : 'Chưa xong'}
          </p>
        </div>
      </label>
    </li>
  );
};

const OnboardingTaskSkeleton: React.FC = () => (
  <ul className="space-y-2 animate-pulse" aria-busy="true" aria-label="Đang tải lộ trình onboarding">
    {[0, 1, 2].map((i) => (
      <li key={i} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
        <div className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-slate-100" />
          <div className="h-3 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-16 rounded bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-12 rounded bg-slate-100" />
          <div className="h-3 w-14 rounded bg-slate-100" />
        </div>
      </li>
    ))}
  </ul>
);

const OnboardingChecklistWidget: React.FC = () => {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [progress, setProgress] = useState<ProgressSummary>(EMPTY_PROGRESS);

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<number>>(new Set());
  // Ref chặn click kép trước khi React kịp render lại state
  const inFlightRef = useRef<Set<number>>(new Set());

  const loadOnboardingTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await onboardingApi.getTasks();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setProgress({
        progressPercent: data.progressPercent,
        totalTasks: data.totalTasks,
        completedTasks: data.completedTasks,
      });
    } catch {
      setLoadError('Không thể tải lộ trình onboarding.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOnboardingTasks();
  }, [loadOnboardingTasks]);

  const setTaskUpdating = (taskId: number, isUpdating: boolean) => {
    if (isUpdating) inFlightRef.current.add(taskId);
    else inFlightRef.current.delete(taskId);
    setUpdatingTaskIds(new Set(inFlightRef.current));
  };

  const handleToggle = async (task: OnboardingTask) => {
    if (inFlightRef.current.has(task.id)) return;
    setTaskUpdating(task.id, true);
    setActionError(null);

    const nextCompleted = !task.isCompleted;
    const delta = nextCompleted ? 1 : -1;

    // Bước 1–2: cập nhật lạc quan task + tiến độ
    setTasks((cur) =>
      cur.map((t) =>
        t.id === task.id
          ? { ...t, isCompleted: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : null }
          : t,
      ),
    );
    setProgress((cur) => {
      const completedTasks = cur.completedTasks + delta;
      return { ...cur, completedTasks, progressPercent: calcProgressPercent(completedTasks, cur.totalTasks) };
    });

    try {
      // Bước 3–4: gọi API, lấy kết quả backend làm chuẩn
      const res = await onboardingApi.toggleTask(task.id);
      setTasks((cur) =>
        cur.map((t) =>
          t.id === task.id
            ? { ...t, isCompleted: res.task.isCompleted, completedAt: res.task.completedAt ?? null }
            : t,
        ),
      );
      setProgress({
        progressPercent: res.progressPercent,
        totalTasks: res.totalTasks,
        completedTasks: res.completedTasks,
      });
    } catch {
      // Bước 5: khôi phục đúng task này và hoàn lại phần chênh lệch tiến độ
      setTasks((cur) =>
        cur.map((t) =>
          t.id === task.id ? { ...t, isCompleted: task.isCompleted, completedAt: task.completedAt ?? null } : t,
        ),
      );
      setProgress((cur) => {
        const completedTasks = cur.completedTasks - delta;
        return { ...cur, completedTasks, progressPercent: calcProgressPercent(completedTasks, cur.totalTasks) };
      });
      setActionError('Không thể cập nhật nhiệm vụ. Trạng thái trước đó đã được khôi phục.');
    } finally {
      setTaskUpdating(task.id, false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setActionError(null);
    try {
      await onboardingApi.seedTasks();
      await loadOnboardingTasks();
    } catch {
      setActionError('Không thể tạo nhiệm vụ mẫu. Vui lòng thử lại.');
    } finally {
      setSeeding(false);
    }
  };

  const filteredTasks =
    activeCategory === 'ALL' ? tasks : tasks.filter((task) => task.category === activeCategory);

  const hasTasks = tasks.length > 0;
  const isAllDone = hasTasks && progress.totalTasks > 0 && progress.completedTasks === progress.totalTasks;

  const renderBody = () => {
    if (loading) return <OnboardingTaskSkeleton />;

    if (loadError) {
      return (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-sm text-rose-700">{loadError}</p>
          <button type="button" onClick={loadOnboardingTasks} className={`mt-3 ${SECONDARY_BUTTON_CLASS}`}>
            Thử lại
          </button>
        </div>
      );
    }

    if (!hasTasks) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-slate-900">Bắt đầu lộ trình thử việc 30 ngày</p>
          <p className="mt-1 text-xs text-slate-500">
            Chưa có nhiệm vụ onboarding nào được tạo cho tài khoản này.
          </p>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold
              hover:bg-slate-800 transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {seeding ? 'Đang tạo nhiệm vụ...' : 'Tạo 10 nhiệm vụ mẫu'}
          </button>
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <p className="py-6 text-center text-xs text-slate-500">Không có nhiệm vụ nào trong nhóm này.</p>
      );
    }

    return (
      <ul className="space-y-2">
        {filteredTasks.map((task) => (
          <OnboardingTaskRow
            key={task.id}
            task={task}
            isUpdating={updatingTaskIds.has(task.id)}
            onToggle={handleToggle}
          />
        ))}
      </ul>
    );
  };

  return (
    <section
      aria-labelledby="onboarding-checklist-title"
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
    >
      <h3 id="onboarding-checklist-title" className="text-sm font-bold text-slate-900">
        Checklist Hội Nhập 30 Ngày
      </h3>
      <p className="text-xs text-slate-500 mt-1">Hoàn thành các mốc quan trọng trong tháng đầu tiên</p>

      {/* Tiến độ */}
      {!loading && !loadError && hasTasks && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className="text-xs text-slate-600">
              {progress.completedTasks} / {progress.totalTasks} nhiệm vụ hoàn thành
              {isAllDone && <span className="ml-2 font-semibold text-emerald-700">Đã hoàn thành onboarding</span>}
            </p>
            <p className="text-sm font-bold text-slate-900 tabular-nums">{progress.progressPercent}%</p>
          </div>
          <div
            className="h-2 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Tiến độ onboarding"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.progressPercent}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${isAllDone ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Bộ lọc danh mục */}
      {!loading && !loadError && hasTasks && (
        <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Lọc nhiệm vụ theo danh mục">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveCategory(f.value)}
              aria-pressed={activeCategory === f.value}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                ${activeCategory === f.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {actionError && (
        <div role="alert" className="mt-4 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-700">{actionError}</p>
        </div>
      )}

      <div className="mt-4">{renderBody()}</div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────────────────────────────
export const EmployeeWorkspacePage: React.FC = () => {
  const { user } = useAuth();

  // ── State: Mood Check-in (Thành viên 3) ──
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [todayMood, setTodayMood] = useState<EmployeeMood | null>(null);
  const [isLoadingMood, setIsLoadingMood] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [moodHistory, setMoodHistory] = useState<EmployeeMood[]>([]);

  // ── Helpers: Lời chào cá nhân hóa (tham khảo Notion, Slack, Lattice) ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 17) return 'Chào buổi chiều';
    if (hour >= 17 && hour < 22) return 'Chào buổi tối';
    return 'Khuya rồi, giữ sức khoẻ nhé';
  };

  const getDisplayName = () => {
    // Lấy tên (phần cuối cùng trước ngoặc) — VD: "Phạm Hồng Quân (New Hire)" → "Quân"
    const clean = user?.fullName?.replace(/\s*\(.*?\)\s*$/, '') || '';
    return clean.split(' ').pop() || 'bạn';
  };

  const getFormattedDate = () =>
    new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  // ── Helper: Tạo lưới 7 ngày cho mood history dots ──
  const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const MOOD_DOT_COLORS: Record<string, string> = {
    GREAT: 'bg-emerald-400',
    NORMAL: 'bg-amber-400',
    STRESSED: 'bg-rose-400',
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const moodRecord = moodHistory.find((m) => {
        const rd = new Date(m.createdAt);
        const rk = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`;
        return rk === dateKey;
      });

      days.push({
        dayName: WEEKDAY_SHORT[date.getDay()],
        mood: moodRecord?.mood || null,
        isToday: i === 0,
      });
    }
    return days;
  };

  // ── Effect: Kiểm tra đã check-in hôm nay chưa khi mở trang ──
  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      loadTodayMood();
    } else {
      setIsLoadingMood(false);
    }
  }, [user?.role]);

  const loadTodayMood = async () => {
    try {
      setIsLoadingMood(true);
      const [mood, history] = await Promise.all([
        onboardingApi.getTodayMood(),
        onboardingApi.getMoodHistory(),
      ]);
      if (mood) setTodayMood(mood);
      setMoodHistory(Array.isArray(history) ? history : []);
    } catch {
      // Chưa check-in hoặc API chưa sẵn sàng → bình thường, hiện widget
    } finally {
      setIsLoadingMood(false);
    }
  };

  // ── Handler: Gửi check-in cảm xúc ──
  const handleSubmitMood = async () => {
    if (!selectedMood) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await onboardingApi.checkInMood({
        mood: selectedMood,
        feedbackText: feedbackText.trim() || undefined,
      });
      setTodayMood(result);
      setSubmitSuccess(true);
      // Hiệu ứng thành công 2 giây trước khi chuyển sang summary
      setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helpers ──
  const getMoodConfig = (value: string) =>
    MOOD_OPTIONS.find((m) => m.value === value);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const currentMoodConfig = selectedMood ? getMoodConfig(selectedMood) : null;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-emerald-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 1. GÓC NHÌN EMPLOYEE — KHÔNG GIAN HỘI NHẬP CÁ NHÂN     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {user?.role === 'EMPLOYEE' && (
          <div className="space-y-6">
            {/* ── Personalized Greeting Header (Notion / Lattice / Slack style) ── */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {getGreeting()},{' '}
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {getDisplayName()}
                  </span>
                  <span className="text-2xl sm:text-3xl">👋</span>
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-sm text-slate-400 font-medium">
                    {getFormattedDate()}
                  </p>
                  {user?.departmentName && (
                    <>
                      <span className="text-slate-300">·</span>
                      <p className="text-sm text-slate-400">{user.departmentName}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/60 backdrop-blur border border-white/40 rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold text-slate-500">Không Gian Của Tôi</span>
              </div>
            </div>

            {/* ── Bento Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* ══════════════════════════════════════════════════════ */}
              {/* MOOD CHECK-IN WIDGET (col-span-2) — Thành viên 3     */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-2">
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">

                  {/* ─── Skeleton Loading (Linear / Vercel style) ─── */}
                  {isLoadingMood && (
                    <div className="animate-pulse" aria-busy="true" aria-hidden="true">
                      <div className="h-5 w-52 bg-slate-200/70 rounded-lg mb-2.5" />
                      <div className="h-3.5 w-72 bg-slate-200/50 rounded-lg mb-7" />
                      <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        <div className="h-32 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-2xl" />
                        <div className="h-32 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-2xl" />
                        <div className="h-32 bg-gradient-to-br from-rose-200/40 to-pink-200/40 rounded-2xl" />
                      </div>
                    </div>
                  )}

                  {/* ─── ĐÃ CHECK-IN → Summary Card ─── */}
                  {!isLoadingMood && todayMood && (() => {
                    const cfg = getMoodConfig(todayMood.mood);
                    const MoodIcon = cfg?.icon || Sun;
                    return (
                      <div className={`rounded-2xl p-6 ${cfg?.bgLight || 'bg-slate-50'} border border-white/60 transition-all duration-500`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">
                              Đã chia sẻ hôm nay
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(todayMood.createdAt)}
                          </div>
                        </div>

                        {/* Mood Display */}
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg?.gradient} flex items-center justify-center shadow-xl ${cfg?.shadow}`}>
                            <MoodIcon className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <p className={`text-xl font-black ${cfg?.textColor}`}>
                              {cfg?.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {cfg?.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Feedback text nếu có */}
                        {todayMood.feedbackText && (
                          <div className="mt-5 bg-white/60 rounded-xl p-4 border border-white/50">
                            <p className="text-sm text-slate-600 italic leading-relaxed">
                              &ldquo;{todayMood.feedbackText}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <p className="mt-5 text-xs text-slate-400 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-400" />
                          Cảm ơn bạn đã chia sẻ. Hẹn gặp lại ngày mai!
                        </p>
                      </div>
                    );
                  })()}

                  {/* ─── CHƯA CHECK-IN → Widget chọn mood ─── */}
                  {!isLoadingMood && !todayMood && (
                    <div>
                      {/* Header */}
                      <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          Hôm nay bạn{' '}
                          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            cảm thấy
                          </span>{' '}
                          thế nào?
                        </h3>
                        <p className="text-sm text-slate-400 mt-1.5">
                          Chia sẻ tâm trạng hàng ngày để chúng tôi hỗ trợ bạn tốt nhất
                        </p>
                      </div>

                      {/* ── 3 Mood Cards ── */}
                      <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {MOOD_OPTIONS.map((mood) => {
                          const Icon = mood.icon;
                          const isSelected = selectedMood === mood.value;
                          const hasSelection = selectedMood !== null;

                          return (
                            <button
                              key={mood.value}
                              onClick={() => {
                                setSelectedMood(
                                  selectedMood === mood.value ? null : mood.value,
                                );
                                setErrorMsg('');
                              }}
                              disabled={isSubmitting || submitSuccess}
                              className={`
                                relative rounded-2xl p-4 sm:p-5 text-center
                                bg-gradient-to-br ${mood.gradient}
                                transition-all duration-300 ease-out
                                focus:outline-none
                                ${isSelected
                                  ? `scale-105 ring-4 ${mood.ring} shadow-xl ${mood.shadow} z-10`
                                  : hasSelection
                                    ? 'opacity-40 scale-95 saturate-50'
                                    : 'hover:shadow-lg hover:scale-[1.03] active:scale-[0.97]'
                                }
                                ${isSubmitting || submitSuccess ? 'pointer-events-none' : 'cursor-pointer'}
                              `}
                            >
                              <Icon className="w-8 h-8 sm:w-9 sm:h-9 text-white/90 mx-auto mb-2.5 drop-shadow" />
                              <p className="text-sm font-black text-white drop-shadow-sm">
                                {mood.label}
                              </p>
                              <p className="text-[11px] text-white/70 mt-0.5 font-medium">
                                {mood.subtitle}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Textarea — Progressive Disclosure ── */}
                      <div
                        className={`
                          overflow-hidden transition-all duration-500 ease-out
                          ${selectedMood ? 'max-h-52 opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0'}
                        `}
                      >
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder={currentMoodConfig?.placeholder}
                          disabled={isSubmitting || submitSuccess}
                          rows={3}
                          className="
                            w-full px-4 py-3.5 bg-white/80 border border-slate-200/80 rounded-2xl
                            text-sm text-slate-700 placeholder-slate-400 leading-relaxed
                            focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300
                            resize-none transition-all duration-300
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        />
                      </div>

                      {/* ── Error Message ── */}
                      {errorMsg && (
                        <div className="mt-3 px-4 py-2.5 bg-rose-50 border border-rose-200/80 rounded-xl">
                          <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
                        </div>
                      )}

                      {/* ── Submit Button — 3 trạng thái ── */}
                      <div
                        className={`
                          overflow-hidden transition-all duration-500 ease-out
                          ${selectedMood ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}
                        `}
                      >
                        <button
                          onClick={handleSubmitMood}
                          disabled={!selectedMood || isSubmitting || submitSuccess}
                          className={`
                            w-full py-3.5 rounded-2xl text-sm font-bold
                            transition-all duration-300 ease-out
                            flex items-center justify-center gap-2
                            ${submitSuccess
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200/60 scale-[0.98]'
                              : isSubmitting
                                ? 'bg-indigo-400 text-white cursor-wait'
                                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200/40 hover:shadow-xl hover:shadow-indigo-200/60 active:scale-[0.97]'
                            }
                            disabled:cursor-not-allowed
                          `}
                        >
                          {submitSuccess ? (
                            <>
                              <Check className="w-4 h-4" />
                              Đã ghi nhận!
                            </>
                          ) : isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang gửi...
                            </>
                          ) : (
                            'Chia sẻ cảm nhận →'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* STATUS TILE (col-span-1) — Thông tin nhanh            */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-1">
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm h-full flex flex-col justify-between">
                  {/* ── Top: Trạng thái hôm nay ── */}
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200/50">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      Trạng thái hôm nay
                    </p>
                    <div className="mt-2.5">
                      {isLoadingMood ? (
                        <div className="animate-pulse mx-auto w-24 h-6 bg-slate-200/60 rounded-full" />
                      ) : todayMood ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700">Đã chia sẻ</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5">
                            {formatTime(todayMood.createdAt)} · {getMoodConfig(todayMood.mood)?.label}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/60">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-xs font-bold text-slate-500">Chưa chia sẻ</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5">
                            Chọn tâm trạng bên trái
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Bottom: Mood History 7 ngày (Officevibe / Culture Amp style) ── */}
                  <div className="mt-5 pt-5 border-t border-slate-200/60">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mb-3">
                      7 ngày gần đây
                    </p>
                    {isLoadingMood ? (
                      <div className="animate-pulse flex justify-center gap-2.5">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-slate-200/60" />
                            <div className="w-4 h-2 rounded bg-slate-200/40" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2.5">
                        {getLast7Days().map((day, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5 group" title={
                            day.mood
                              ? `${day.dayName}: ${getMoodConfig(day.mood)?.label}`
                              : `${day.dayName}: Chưa check-in`
                          }>
                            {/* Mood Dot */}
                            <div
                              className={`
                                w-3.5 h-3.5 rounded-full transition-all duration-300
                                ${day.mood
                                  ? `${MOOD_DOT_COLORS[day.mood]} shadow-sm group-hover:scale-125`
                                  : 'border-2 border-slate-300/60 bg-transparent'
                                }
                                ${day.isToday ? 'ring-2 ring-indigo-300/50 ring-offset-1' : ''}
                              `}
                            />
                            {/* Day Label */}
                            <span className={`text-[9px] font-bold ${day.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {day.dayName}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* CHECKLIST 30 NGÀY (col-span-2)                        */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-2">
                <OnboardingChecklistWidget />
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* AI COPILOT CHAT (col-span-1) — Placeholder TV4        */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-1">
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200/50">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">HR Copilot RAG 24/7</h3>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          Trực tuyến
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Hỏi đáp chính sách ngày phép, bảo hiểm, nội quy hoặc gõ{' '}
                      <em className="text-indigo-500 font-medium">&quot;tôi đã nộp cccd&quot;</em> để tự tích task.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-slate-200/60 rounded-2xl p-8 text-center text-slate-400 text-xs my-5 flex-1 flex items-center justify-center bg-white/30">
                    <div>
                      <Bot className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      Khung Chat Copilot • Thành viên 4 sẽ tích hợp Gemini RAG tại đây
                    </div>
                  </div>

                  <input
                    type="text"
                    disabled
                    placeholder="Nhập câu hỏi quy chế..."
                    className="w-full px-4 py-2.5 border border-slate-200/80 rounded-xl text-xs bg-white/50 cursor-not-allowed placeholder-slate-400"
                  />
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* KHÓA HỌC L&D (col-span-3) — Placeholder TV4          */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-3">
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" /> Khóa Học AI Chỉ Định (L&D)
                  </h3>
                  <div className="border-2 border-dashed border-slate-200/60 rounded-2xl p-6 text-center text-slate-400 text-xs bg-white/30">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    Khung sườn Khóa học &amp; Thanh tiến độ % • Thành viên 4 sẽ kết nối API tại đây
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 2. GÓC NHÌN MANAGER — GIÁM SÁT SỨC KHỎE TINH THẦN      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {user?.role === 'MANAGER' && (
          <div className="space-y-6">
            {/* Banner hướng dẫn Thành viên 3 */}
            <div className="p-4 rounded-2xl bg-amber-50/70 backdrop-blur-sm border border-amber-200/80 flex items-start gap-3">
              <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full">
                    Khung Sườn Chờ Code • Sprint 3 &amp; 4
                  </span>
                  <span className="text-xs font-bold text-amber-900">
                    Theo Dõi Sức Khỏe Tinh Thần Đội Ngũ (Team Mood Monitor)
                  </span>
                </div>
                <p className="text-xs text-amber-700/90 mt-1">
                  📌 <strong>Phân công: Thành viên 3</strong> sẽ kết nối bảng{' '}
                  <code className="bg-white/80 px-1 rounded">employee_moods</code>, hiển thị chỉ số
                  cảm xúc các thành viên team mình, nhận diện cảnh báo kiệt sức và nút{' '}
                  <em>Hẹn 1-on-1 Gỡ Rối</em> để giải quyết cảnh báo.
                </p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-sm">
              <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" /> Giám Sát Sức Khỏe Tinh Thần &amp;
                Tiến Độ Hội Nhập
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Dành riêng cho Trưởng phòng phụ trách bộ phận Kỹ thuật Phần mềm (TECH)
              </p>

              <div className="border-2 border-dashed border-slate-200/60 rounded-2xl p-12 text-center text-slate-400 bg-white/30">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">
                  Khung sườn danh sách thành viên • Thành viên 3 sẽ tích hợp bảng Team Mood tại đây
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 3. GÓC NHÌN KHÁC (HR / SUPERADMIN)                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        {(user?.role === 'HR' || user?.role === 'SUPERADMIN') && (
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-3xl shadow-sm text-center text-slate-600">
            <Users className="w-10 h-10 mx-auto mb-2 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Không Gian Làm Việc Nhân Viên</h2>
            <p className="text-xs text-slate-500 mt-1">
              Vui lòng sử dụng bộ chuyển Role trên thanh điều hướng để trải nghiệm góc nhìn của{' '}
              <strong>EMPLOYEE</strong> hoặc <strong>MANAGER</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};