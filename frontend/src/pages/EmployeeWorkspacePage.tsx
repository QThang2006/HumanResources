import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { onboardingApi } from '../api/onboarding.api';
import { ManagerTeamMoodWidget } from '../features/team-mood/ManagerTeamMoodWidget';
import { ManagerTeamOnboardingWidget } from '../features/team-onboarding/ManagerTeamOnboardingWidget';
import type { EmployeeMood, OnboardingTask, TaskCategory } from '../types';
import { EmployeeTrainingsWidget } from '../components/EmployeeTrainingsWidget';
import {
  Sun,
  CloudSun,
  CloudRain,
  Check,
  Loader2,
  Clock,
  Heart,
  Calendar,
  Sparkles,
  Activity,
  ListTodo,
  BookOpen,
  Send,
  TrendingUp,
  Flame,
  ShieldCheck,
  Target,
  Briefcase,
  Building,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// CẤU HÌNH MOOD — Weather Metaphor & Energy Pulse (Lattice / 15Five Style)
// ─────────────────────────────────────────────────────────────────────
const MOOD_OPTIONS = [
  {
    value: 'GREAT' as const,
    label: 'Tuyệt Vời',
    subtitle: 'Tràn đầy năng lượng',
    desc: 'Làm việc tập trung, tâm lý phấn khởi và sẵn sàng bứt phá',
    icon: Sun,
    activeBorder: 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs',
    iconBg: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bgLight: 'bg-emerald-50/70 border-emerald-200',
    textColor: 'text-emerald-700',
    placeholder: 'Chia sẻ điều tuyệt vời hoặc thành tựu nhỏ hôm nay của bạn... (không bắt buộc)',
  },
  {
    value: 'NORMAL' as const,
    label: 'Bình Thường',
    subtitle: 'Nhịp độ ổn định',
    desc: 'Công việc diễn ra đều đặn, không có trở ngại hay áp lực lớn',
    icon: CloudSun,
    activeBorder: 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs',
    iconBg: 'bg-amber-500 text-white shadow-sm shadow-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    bgLight: 'bg-amber-50/70 border-amber-200',
    textColor: 'text-amber-700',
    placeholder: 'Bạn có điều gì cần lưu ý hay muốn chia sẻ thêm không? (không bắt buộc)',
  },
  {
    value: 'STRESSED' as const,
    label: 'Căng Thẳng',
    subtitle: 'Cần gỡ rối & hỗ trợ',
    desc: 'Khối lượng công việc cao, tiến độ dồn dập hoặc gặp thử thách kỹ thuật',
    icon: CloudRain,
    activeBorder: 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20 shadow-xs',
    iconBg: 'bg-rose-500 text-white shadow-sm shadow-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    bgLight: 'bg-rose-50/70 border-rose-200',
    textColor: 'text-rose-700',
    placeholder: 'Điều gì đang khiến bạn quá tải? (Phản hồi của bạn được bảo mật tuyệt đối)',
  },
];

type MoodValue = 'GREAT' | 'NORMAL' | 'STRESSED';

// Gợi ý tag cảm xúc nhanh giúp người dùng click 1 chạm
const QUICK_FEEDBACK_TAGS = [
  '🚀 Hoàn thành sprint đúng hạn',
  '💻 Gặp lỗi kỹ thuật phức tạp',
  '⏱️ Áp lực tiến độ & deadline',
  '🤝 Cần mentor hỗ trợ 1-on-1',
  '☕ Ngày làm việc hứng khởi',
];

// ─────────────────────────────────────────────────────────────────────
// CHECKLIST ONBOARDING 30 NGÀY — Dữ liệu từ Backend & Optimistic Toggle
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
  EQUIPMENT: { label: 'Thiết bị', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  TRAINING: { label: 'Đào tạo', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEETING: { label: 'Gặp gỡ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const calcProgressPercent = (completed: number, total: number) =>
  total === 0 ? 0 : Math.round((completed / total) * 100);

const SECONDARY_BUTTON_CLASS =
  'px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 ' +
  'hover:bg-slate-50 transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed shadow-xs';

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
        className={`group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl
          transition-all duration-150 hover:border-slate-300 hover:shadow-xs
          ${isUpdating ? 'cursor-wait opacity-75' : 'cursor-pointer'}
          ${task.isCompleted ? 'bg-slate-50/50' : 'bg-white'}`}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={task.isCompleted}
          disabled={isUpdating}
          onChange={() => onToggle(task)}
          aria-label={`${task.isCompleted ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}: ${task.title}`}
        />
        {/* Checkbox phong cách Enterprise với animation tick */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded-md border-2
            transition-all duration-200
            peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2
            ${
              task.isCompleted
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-300 group-hover:border-blue-500'
            }`}
        >
          {task.isCompleted && (
            <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold break-words transition-colors ${
              task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-blue-900'
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p
              className={`mt-0.5 text-xs leading-relaxed break-words ${
                task.isCompleted ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {task.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Hạn: Ngày {task.dueDay}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              task.isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {task.isCompleted ? 'Đã xong' : 'Chưa xong'}
          </span>
        </div>
      </label>
    </li>
  );
};

const OnboardingTaskSkeleton: React.FC = () => (
  <ul className="space-y-2.5 animate-pulse" aria-busy="true" aria-label="Đang tải lộ trình onboarding">
    {[0, 1, 2].map((i) => (
      <li key={i} className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
        <div className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-20 rounded bg-slate-100" />
        </div>
        <div className="w-16 h-5 rounded-full bg-slate-100" />
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
        <div className="py-10 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">Bắt đầu lộ trình thử việc 30 ngày</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Chưa có nhiệm vụ onboarding nào được tạo cho tài khoản này. Nhấn nút dưới đây để khởi tạo bộ 10 nhiệm vụ mẫu chuẩn.
          </p>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold
              hover:bg-blue-700 transition-colors duration-150 shadow-xs
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {seeding ? 'Đang tạo nhiệm vụ...' : 'Khởi tạo 10 nhiệm vụ mẫu'}
          </button>
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-slate-500">
          Không có nhiệm vụ nào trong nhóm này.
        </div>
      );
    }

    return (
      <ul className="space-y-2.5">
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
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col h-[560px]"
    >
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 id="onboarding-checklist-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Lộ Trình Hội Nhập 30 Ngày
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hoàn thành các mốc quan trọng trong tháng đầu tiên để vượt qua thử việc
            </p>
          </div>
          {hasTasks && (
            <span className="text-xs font-bold text-slate-700 tabular-nums bg-slate-100 px-2.5 py-1 rounded-lg">
              {progress.completedTasks}/{progress.totalTasks} Hoàn thành
            </span>
          )}
        </div>

        {/* Thanh tiến độ trực quan */}
        {!loading && !loadError && hasTasks && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Tiến độ tổng thể</span>
                {isAllDone && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3 stroke-[3]" /> Tốt nghiệp Onboarding 100%
                  </span>
                )}
              </p>
              <p className="text-sm font-black text-slate-900 tabular-nums">{progress.progressPercent}%</p>
            </div>
            <div
              className="h-2.5 bg-slate-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Tiến độ onboarding"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.progressPercent}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isAllDone ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bộ lọc danh mục dạng Segmented Buttons */}
        {!loading && !loadError && hasTasks && (
          <div className="mt-3 flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-lg" role="group" aria-label="Lọc nhiệm vụ theo danh mục">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveCategory(f.value)}
                aria-pressed={activeCategory === f.value}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${
                    activeCategory === f.value
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {actionError && (
          <div role="alert" className="mt-2.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-700">{actionError}</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">{renderBody()}</div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────
// AI COPILOT — Trợ Lý Sổ Tay Nhân Viên (POST /onboarding/chat)
// ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceDocuments?: string[];
}

const SUGGESTED_QUESTIONS = [
  '🏖️ Nghỉ phép năm?',
  '💵 Lương chi trả ngày nào?',
  '📶 Cách cài Wi-Fi văn phòng?',
  '🏠 Quy định làm việc từ xa?',
];

const NEAR_BOTTOM_THRESHOLD_PX = 80;

const CopilotTypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div
      role="status"
      className="inline-flex items-center gap-1.5 px-4 py-3 bg-slate-100 border border-slate-200/80 rounded-2xl rounded-bl-xs"
    >
      <span className="sr-only">Copilot đang soạn câu trả lời</span>
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse [animation-delay:200ms]" />
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse [animation-delay:400ms]" />
    </div>
  </div>
);

const CopilotMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] px-4 py-2.5 bg-blue-600 text-white text-xs sm:text-sm leading-relaxed rounded-2xl rounded-br-xs shadow-xs whitespace-pre-wrap [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>
    );
  }

  const sources = message.sourceDocuments ?? [];
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] px-4 py-3 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-2xl rounded-bl-xs">
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
        {sources.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/80">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tài liệu quy chế tham chiếu</p>
            <ul className="mt-1 space-y-1">
              {sources.map((name, idx) => (
                <li key={`${name}-${idx}`} className="text-xs text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md inline-block mr-1.5 [overflow-wrap:anywhere]">
                  📄 {name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const CopilotChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);

  const isLoadingRef = useRef(false);
  const messageIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const inputId = useId();

  const nextId = () => `msg-${++messageIdRef.current}`;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, error]);

  const requestReply = async (text: string) => {
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    setFailedPrompt(null);
    try {
      const res = await onboardingApi.chatWithCopilot(text);
      setMessages((cur) => [
        ...cur,
        { id: nextId(), role: 'assistant', content: res.reply, sourceDocuments: res.sourceDocuments ?? [] },
      ]);
    } catch {
      setFailedPrompt(text);
      setError('Không thể nhận câu trả lời lúc này. Vui lòng thử lại.');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  };

  const submitMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || isLoadingRef.current) return;
    stickToBottomRef.current = true;
    setMessages((cur) => [...cur, { id: nextId(), role: 'user', content: text }]);
    setInput('');
    await requestReply(text);
  };

  const handleRetry = () => {
    if (!failedPrompt || isLoadingRef.current) return;
    stickToBottomRef.current = true;
    requestReply(failedPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <section
      aria-labelledby="copilot-title"
      className="h-[560px] flex flex-col bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 id="copilot-title" className="text-sm font-bold text-slate-900 leading-tight">AI Copilot</h3>
            <p className="text-[11px] text-slate-500">Trợ lý sổ tay nhân viên 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {isLoading ? 'Đang suy nghĩ' : 'Trực tuyến'}
        </div>
      </div>

      {/* Conversation Log */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Cuộc hội thoại với AI Copilot"
        className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1"
      >
        {messages.length === 0 && !isLoading ? (
          <div className="py-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">Hỏi đáp quy chế & quyền lợi nhân sự</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Copilot tra cứu trực tiếp kho tài liệu PDF nội bộ để giải đáp chính xác mọi câu hỏi của bạn.
            </p>
            <div className="mt-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Gợi ý nhanh</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => submitMessage(q.replace(/^[^\s]+\s*/, ''))}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700
                      hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors duration-150
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => <CopilotMessageBubble key={m.id} message={m} />)
        )}

        {isLoading && <CopilotTypingIndicator />}

        {error && (
          <div role="alert" className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-700">{error}</p>
            {failedPrompt && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isLoading}
                className="mt-2 px-2.5 py-1 rounded-md border border-rose-300 bg-white text-xs font-semibold text-rose-700
                  hover:bg-rose-50 transition-colors duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Thử lại câu hỏi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="shrink-0 mt-3 pt-3 border-t border-slate-100 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitMessage(input);
        }}
      >
        <label htmlFor={inputId} className="sr-only">Câu hỏi gửi tới AI Copilot</label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Hỏi về nghỉ phép, bảo hiểm, chế độ đãi ngộ..."
          className="flex-1 min-w-0 px-3.5 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400
            resize-none max-h-28 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="shrink-0 min-h-[42px] px-3.5 rounded-lg bg-blue-600 text-white text-xs font-semibold
            hover:bg-blue-700 transition-colors duration-150 flex items-center gap-1.5 shadow-xs
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Gửi</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────
// COMPONENT CHÍNH WORKSPACE
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

  // ── State: Tab quản lý (ONBOARDING tracker, MOOD, hoặc MY_CHECKLIST) ──
  const [managerActiveTab, setManagerActiveTab] = useState<'ONBOARDING' | 'MOOD' | 'MY_CHECKLIST'>('ONBOARDING');

  // ── Helpers ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 17) return 'Chào buổi chiều';
    if (hour >= 17 && hour < 22) return 'Chào buổi tối';
    return 'Chúc bạn buổi tối an lành';
  };

  const getDisplayName = () => {
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

  const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const MOOD_DOT_COLORS: Record<string, string> = {
    GREAT: 'bg-emerald-500 ring-2 ring-emerald-200',
    NORMAL: 'bg-amber-400 ring-2 ring-amber-200',
    STRESSED: 'bg-rose-500 ring-2 ring-rose-200',
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
        dateNumber: date.getDate(),
        mood: moodRecord?.mood || null,
        isToday: i === 0,
      });
    }
    return days;
  };

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
      // Chưa check-in -> giữ state null
    } finally {
      setIsLoadingMood(false);
    }
  };

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
      setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    if (feedbackText.includes(tag)) return;
    setFeedbackText((cur) => (cur ? `${cur} • ${tag}` : tag));
  };

  const getMoodConfig = (value: string) =>
    MOOD_OPTIONS.find((m) => m.value === value);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const currentMoodConfig = selectedMood ? getMoodConfig(selectedMood) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 1. GÓC NHÌN EMPLOYEE — KHÔNG GIAN HỘI NHẬP CÁ NHÂN     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {user?.role === 'EMPLOYEE' && (
          <div className="space-y-6">

            {/* ── Executive Hero Header Banner ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {getGreeting()}, <span className="text-blue-600">{getDisplayName()}</span>!
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <Sparkles className="w-3 h-3" /> Thành viên mới
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {getFormattedDate()}
                    </span>
                    {user?.departmentName && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          Phòng {user.departmentName}
                        </span>
                      </>
                    )}
                    {user?.role && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          Nhân viên thử việc 30 ngày
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Thẻ Ticker Nhanh */}
              <div className="flex items-center gap-2.5 sm:gap-3 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[110px] text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái ngày</p>
                  <p className="text-xs font-bold mt-0.5 text-slate-800">
                    {todayMood ? '✅ Đã chia sẻ' : '⏳ Chưa check-in'}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[110px] text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chuỗi Check-in</p>
                  <p className="text-xs font-bold mt-0.5 text-blue-700 flex items-center justify-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {moodHistory.length} ngày
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[110px] text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bảo mật thông tin</p>
                  <p className="text-xs font-bold mt-0.5 text-emerald-700 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Nội bộ 100%
                  </p>
                </div>
              </div>
            </div>

            {/* ── BỐ CỤC 2 CỘT EXECUTIVE (TỈ LỆ VÀNG 8:4) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* ══════════════════════════════════════════════════════ */}
              {/* CỘT TRÁI (8 COLS): KHÔNG GIAN TÁC VỤ CHÍNH           */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6">

                {/* ── 1. MOOD CHECK-IN WIDGET (Weather Metaphor & Boarding Pass) ── */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                  {isLoadingMood && (
                    <div className="animate-pulse space-y-4">
                      <div className="h-5 w-48 bg-slate-200 rounded-md" />
                      <div className="h-3.5 w-72 bg-slate-100 rounded-md" />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-32 bg-slate-100 rounded-xl" />
                        <div className="h-32 bg-slate-100 rounded-xl" />
                        <div className="h-32 bg-slate-100 rounded-xl" />
                      </div>
                    </div>
                  )}

                  {/* ĐÃ CHECK-IN HÔM NAY (BOARDING PASS NĂNG LƯỢNG) */}
                  {!isLoadingMood && todayMood && (() => {
                    const cfg = getMoodConfig(todayMood.mood);
                    const MoodIcon = cfg?.icon || Sun;
                    return (
                      <div className={`rounded-xl p-6 border ${cfg?.bgLight || 'bg-slate-50 border-slate-200'} transition-all duration-300`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              Đã hoàn thành check-in cảm xúc hôm nay
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatTime(todayMood.createdAt)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/80 p-4 rounded-xl border border-slate-200/60 shadow-2xs">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${cfg?.iconBg}`}>
                            <MoodIcon className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-lg font-bold ${cfg?.textColor}`}>
                                {cfg?.label}
                              </p>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg?.badgeClass}`}>
                                {cfg?.subtitle}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {cfg?.desc}
                            </p>
                          </div>
                        </div>

                        {todayMood.feedbackText && (
                          <div className="mt-4 bg-white/90 rounded-xl p-4 border border-slate-200/80 shadow-2xs">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Ghi chú chia sẻ:</p>
                            <p className="text-sm text-slate-700 italic leading-relaxed">
                              &ldquo;{todayMood.feedbackText}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                            Cảm ơn bạn đã chia sẻ. Quản lý luôn đồng hành hỗ trợ bạn!
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">Hẹn gặp lại ngày mai</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* CHƯA CHECK-IN HÔM NAY */}
                  {!isLoadingMood && !todayMood && (
                    <div>
                      <div className="mb-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            Hôm nay bạn cảm thấy thế nào?
                          </h3>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                            Check-in 1-Click
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Chia sẻ mức năng lượng làm việc để công ty kịp thời đồng hành, gỡ rối và khen ngợi bạn
                        </p>
                      </div>

                      {/* 3 Thẻ Mood tương tác */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {MOOD_OPTIONS.map((mood) => {
                          const Icon = mood.icon;
                          const isSelected = selectedMood === mood.value;
                          const hasSelection = selectedMood !== null;

                          return (
                            <button
                              key={mood.value}
                              type="button"
                              onClick={() => {
                                setSelectedMood(selectedMood === mood.value ? null : mood.value);
                                setErrorMsg('');
                              }}
                              disabled={isSubmitting || submitSuccess}
                              className={`
                                relative rounded-xl p-4 text-left border transition-all duration-200
                                ${
                                  isSelected
                                    ? `${mood.activeBorder} scale-[1.02] z-10`
                                    : hasSelection
                                      ? 'border-slate-200 bg-slate-50/50 opacity-60 scale-[0.98]'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-xs'
                                }
                                ${isSubmitting || submitSuccess ? 'pointer-events-none' : 'cursor-pointer'}
                              `}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mood.iconBg}`}>
                                  <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </span>
                              </div>
                              <p className={`text-sm font-bold ${isSelected ? mood.textColor : 'text-slate-900'}`}>
                                {mood.label}
                              </p>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                {mood.subtitle}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Progressive Disclosure: Feedback Tags & Textarea */}
                      <div
                        className={`
                          overflow-hidden transition-all duration-300 ease-out
                          ${selectedMood ? 'max-h-80 opacity-100 mt-4 pt-4 border-t border-slate-100' : 'max-h-0 opacity-0 mt-0'}
                        `}
                      >
                        <div className="mb-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Gợi ý chọn nhanh nội dung (Tùy chọn):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_FEEDBACK_TAGS.map((tag) => {
                              const cleanTag = tag.replace(/^[^\s]+\s*/, '');
                              const isTagActive = feedbackText.includes(cleanTag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleQuickTagClick(tag)}
                                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                                    isTagActive
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                                      : 'border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600'
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder={currentMoodConfig?.placeholder}
                          disabled={isSubmitting || submitSuccess}
                          rows={2}
                          className="
                            w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg
                            text-xs sm:text-sm text-slate-800 placeholder-slate-400 leading-relaxed
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            resize-none transition-all duration-150
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        />
                      </div>

                      {errorMsg && (
                        <div className="mt-3 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                          <p className="text-xs text-rose-700 font-medium">{errorMsg}</p>
                        </div>
                      )}

                      {/* Nút gửi */}
                      <div
                        className={`
                          overflow-hidden transition-all duration-300 ease-out
                          ${selectedMood ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}
                        `}
                      >
                        <button
                          type="button"
                          onClick={handleSubmitMood}
                          disabled={!selectedMood || isSubmitting || submitSuccess}
                          className={`
                            w-full py-2.5 rounded-lg text-xs font-semibold
                            transition-all duration-200 ease-out
                            flex items-center justify-center gap-2 shadow-xs
                            ${
                              submitSuccess
                                ? 'bg-emerald-600 text-white'
                                : isSubmitting
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                            }
                            disabled:cursor-not-allowed disabled:opacity-60
                          `}
                        >
                          {submitSuccess ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              Đã ghi nhận cảm xúc thành công!
                            </>
                          ) : isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang gửi dữ liệu lên hệ thống...
                            </>
                          ) : (
                            'Chia sẻ nhịp cảm xúc hôm nay →'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 2. LỘ TRÌNH ONBOARDING 30 NGÀY ── */}
                <OnboardingChecklistWidget />

                {/* ── 3. KHÓA HỌC & PHÁT TRIỂN NĂNG LỰC ── */}
                <EmployeeTrainingsWidget />
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* CỘT PHẢI (4 COLS): STICKY RHYTHM & AI COPILOT DOCK   */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">

                {/* ── 1. NHỊP CẢM XÚC 7 NGÀY ── */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900">Nhịp Năng Lượng 7 Ngày</h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tuần này</span>
                  </div>

                  <p className="text-xs text-slate-500 mb-4">
                    Biểu đồ liên tục ghi nhận sự nhất quán trong phản hồi tâm trạng của bạn
                  </p>

                  {/* Timeline 7 Cột trực quan */}
                  {isLoadingMood ? (
                    <div className="animate-pulse grid grid-cols-7 gap-1.5 py-4">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1.5 py-2">
                      {getLast7Days().map((day, idx) => {
                        const cfg = day.mood ? getMoodConfig(day.mood) : null;
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col items-center justify-between p-2 rounded-lg border transition-all ${
                              day.isToday
                                ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/50'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-white'
                            }`}
                            title={
                              day.mood
                                ? `${day.dayName} (${day.dateNumber}): ${cfg?.label}`
                                : `${day.dayName}: Chưa check-in`
                            }
                          >
                            <span className={`text-[10px] font-bold ${day.isToday ? 'text-blue-700' : 'text-slate-500'}`}>
                              {day.dayName}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{day.dateNumber}</span>
                            <div className="my-1.5">
                              {day.mood ? (
                                <span className={`w-3 h-3 rounded-full block ${MOOD_DOT_COLORS[day.mood]}`} />
                              ) : (
                                <span className="w-3 h-3 rounded-full border border-slate-300 block bg-white" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Chú thích màu */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Vui vẻ
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Bình thường
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Căng thẳng
                    </span>
                  </div>
                </div>

                {/* ── 2. AI COPILOT CHAT DOCK ── */}
                <CopilotChatWidget />
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 2. GÓC NHÌN QUẢN LÝ (MANAGER, HR, SUPERADMIN)             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {(user?.role === 'MANAGER' || user?.role === 'HR' || user?.role === 'SUPERADMIN') && (
          <div className="space-y-6">
            {/* Thanh Tab Chuyển Đổi Nhanh Dành Cho Quản Lý — Segmented Control Chuẩn */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setManagerActiveTab('ONBOARDING')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
                    managerActiveTab === 'ONBOARDING'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListTodo className="w-4 h-4 text-blue-600" />
                  Tiến Độ Thử Việc Đội Ngũ (30 Ngày)
                </button>
                <button
                  type="button"
                  onClick={() => setManagerActiveTab('MOOD')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
                    managerActiveTab === 'MOOD'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Nhịp Năng Lượng Đội Ngũ (Team Mood)
                </button>
                <button
                  type="button"
                  onClick={() => setManagerActiveTab('MY_CHECKLIST')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
                    managerActiveTab === 'MY_CHECKLIST'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Checklist 30 Ngày (Cá Nhân & Copilot)
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Bàn Điều Hành Quản Lý Đội Ngũ</span>
              </div>
            </div>

            {/* Nội dung Tab Quản Lý */}
            {managerActiveTab === 'ONBOARDING' && <ManagerTeamOnboardingWidget />}
            {managerActiveTab === 'MOOD' && <ManagerTeamMoodWidget />}
            {managerActiveTab === 'MY_CHECKLIST' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="col-span-12 lg:col-span-7 xl:col-span-8">
                  <OnboardingChecklistWidget />
                </div>
                <div className="col-span-12 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
                  <CopilotChatWidget />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
