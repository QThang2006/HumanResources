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
    activeBorder: 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20',
    iconBg: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    bgLight: 'bg-emerald-50/70 border-emerald-200/80',
    textColor: 'text-emerald-700',
    placeholder: 'Điều gì khiến bạn vui hôm nay? (không bắt buộc)',
  },
  {
    value: 'NORMAL' as const,
    label: 'Bình Thường',
    subtitle: 'Ổn định',
    icon: CloudSun,
    activeBorder: 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20',
    iconBg: 'bg-amber-500 text-white shadow-sm shadow-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
    bgLight: 'bg-amber-50/70 border-amber-200/80',
    textColor: 'text-amber-700',
    placeholder: 'Bạn có muốn chia sẻ thêm không? (không bắt buộc)',
  },
  {
    value: 'STRESSED' as const,
    label: 'Căng Thẳng',
    subtitle: 'Cần hỗ trợ',
    icon: CloudRain,
    activeBorder: 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20',
    iconBg: 'bg-rose-500 text-white shadow-sm shadow-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800',
    bgLight: 'bg-rose-50/70 border-rose-200/80',
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
  EQUIPMENT: { label: 'Thiết bị', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  TRAINING: { label: 'Đào tạo', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEETING: { label: 'Gặp gỡ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const calcProgressPercent = (completed: number, total: number) =>
  total === 0 ? 0 : Math.round((completed / total) * 100);

const SECONDARY_BUTTON_CLASS =
  'px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 ' +
  'hover:bg-slate-50 transition-colors duration-200 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
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
            peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2
            ${
              task.isCompleted
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-white border-slate-300 group-hover:border-blue-500'
            }`}
        >
          {task.isCompleted && (
            <span className="block w-1.5 h-2.5 -mt-0.5 rotate-45 border-b-2 border-r-2 border-white" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold break-words ${
              task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
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
          <span
            className={`mt-2 inline-block px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-slate-600">Ngày {task.dueDay}</p>
          <p
            className={`mt-0.5 text-[11px] ${
              task.isCompleted ? 'text-emerald-700 font-medium' : 'text-slate-400'
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
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold
              hover:bg-blue-700 transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
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
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col h-[540px]"
    >
      <div className="shrink-0 mb-3">
        <h3 id="onboarding-checklist-title" className="text-sm font-bold text-slate-900">
          Checklist Hội Nhập 30 Ngày
        </h3>
        <p className="text-xs text-slate-500 mt-1">Hoàn thành các mốc quan trọng trong tháng đầu tiên</p>

        {/* Tiến độ */}
        {!loading && !loadError && hasTasks && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
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
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  isAllDone ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bộ lọc danh mục */}
        {!loading && !loadError && hasTasks && (
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Lọc nhiệm vụ theo danh mục">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveCategory(f.value)}
                aria-pressed={activeCategory === f.value}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  ${
                    activeCategory === f.value
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {actionError && (
          <div role="alert" className="mt-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-700">{actionError}</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">{renderBody()}</div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────
// AI COPILOT — hỏi đáp sổ tay nhân viên (POST /onboarding/chat)
// ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceDocuments?: string[];
}

const SUGGESTED_QUESTIONS = [
  'Nghỉ phép năm?',
  'Lương chi trả ngày nào?',
  'Cách cài Wi-Fi văn phòng?',
  'Quy định làm việc từ xa?',
];

const NEAR_BOTTOM_THRESHOLD_PX = 80;

const CopilotTypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div
      role="status"
      className="inline-flex items-center gap-1 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md"
    >
      <span className="sr-only">AI đang soạn câu trả lời</span>
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:200ms]" />
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:400ms]" />
    </div>
  </div>
);

const CopilotMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] px-3.5 py-2 bg-blue-600 text-white text-sm leading-relaxed rounded-2xl rounded-br-sm shadow-xs whitespace-pre-wrap [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>
    );
  }

  const sources = message.sourceDocuments ?? [];
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] px-3.5 py-2.5 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-2xl rounded-bl-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
        {sources.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500">Nguồn tham khảo</p>
            <ul className="mt-1 space-y-0.5">
              {sources.map((name, idx) => (
                <li key={`${name}-${idx}`} className="text-xs text-slate-600 [overflow-wrap:anywhere]">
                  {name}
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

  const isLoadingRef = useRef(false); // chặn gửi kép trước khi React render lại
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

  // Chỉ tự cuộn khi người dùng đang ở gần cuối; không kéo họ khỏi tin nhắn cũ đang đọc
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

  // Điểm gửi duy nhất — dùng chung cho ô nhập và câu hỏi gợi ý
  const submitMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || isLoadingRef.current) return;
    stickToBottomRef.current = true; // tin nhắn vừa gửi luôn được hiển thị
    setMessages((cur) => [...cur, { id: nextId(), role: 'user', content: text }]);
    setInput('');
    await requestReply(text);
  };

  const handleRetry = () => {
    if (!failedPrompt || isLoadingRef.current) return;
    stickToBottomRef.current = true;
    requestReply(failedPrompt); // không thêm lại tin nhắn người dùng
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: không gửi khi đang gõ dấu tiếng Việt bằng bộ gõ (Telex/VNI)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <section
      aria-labelledby="copilot-title"
      className="h-[540px] flex flex-col bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
    >
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 id="copilot-title" className="text-sm font-bold text-slate-900">AI Copilot</h3>
          <p className="text-xs text-slate-500">Trợ lý sổ tay nhân viên 24/7</p>
        </div>
        <span className="text-[11px] font-medium text-slate-500">{isLoading ? 'Đang xử lý' : 'Sẵn sàng'}</span>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Cuộc hội thoại với AI Copilot"
        className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1"
      >
        {messages.length === 0 && !isLoading ? (
          <div className="py-2">
            <p className="text-sm font-semibold text-slate-900">Hỏi tôi về chính sách, quy định và thông tin trong sổ tay nhân viên.</p>
            <p className="mt-3 text-[11px] font-medium text-slate-500">Câu hỏi gợi ý</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => submitMessage(q)}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700
                    hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <CopilotMessageBubble key={m.id} message={m} />)
        )}

        {isLoading && <CopilotTypingIndicator />}

        {error && (
          <div role="alert" className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-700">{error}</p>
            {failedPrompt && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isLoading}
                className="mt-1.5 px-2.5 py-1 rounded-md border border-rose-300 bg-white text-xs font-semibold text-rose-700
                  hover:bg-rose-50 transition-colors duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Thử lại
              </button>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="shrink-0 mt-3 pt-3 border-t border-slate-200 flex items-end gap-2"
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
          placeholder="Đặt câu hỏi về chính sách nhân sự..."
          className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400
            resize-none max-h-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="shrink-0 min-h-[44px] px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold
            hover:bg-blue-700 transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xs"
        >
          {isLoading ? 'Đang gửi' : 'Gửi'}
        </button>
      </form>
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

  // ── State: Tab quản lý (ONBOARDING tracker, MOOD, hoặc MY_CHECKLIST) ──
  const [managerActiveTab, setManagerActiveTab] = useState<'ONBOARDING' | 'MOOD' | 'MY_CHECKLIST'>('ONBOARDING');

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 1. GÓC NHÌN EMPLOYEE — KHÔNG GIAN HỘI NHẬP CÁ NHÂN     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {user?.role === 'EMPLOYEE' && (
          <div className="space-y-6">
            {/* ── Personalized Greeting Header ── */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {getGreeting()},{' '}
                  <span className="text-blue-600">
                    {getDisplayName()}
                  </span>
                  <span className="text-2xl sm:text-3xl">👋</span>
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-sm text-slate-500 font-medium">
                    {getFormattedDate()}
                  </p>
                  {user?.departmentName && (
                    <>
                      <span className="text-slate-300">·</span>
                      <p className="text-sm text-slate-500">{user.departmentName}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-600">Không Gian Của Tôi</span>
              </div>
            </div>

            {/* ── Grid Layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* ══════════════════════════════════════════════════════ */}
              {/* MOOD CHECK-IN WIDGET (col-span-2) — Thành viên 3     */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">

                  {/* ─── Skeleton Loading ─── */}
                  {isLoadingMood && (
                    <div className="animate-pulse" aria-busy="true" aria-hidden="true">
                      <div className="h-5 w-52 bg-slate-200 rounded-lg mb-2.5" />
                      <div className="h-3.5 w-72 bg-slate-200 rounded-lg mb-7" />
                      <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        <div className="h-28 bg-slate-100 rounded-xl" />
                        <div className="h-28 bg-slate-100 rounded-xl" />
                        <div className="h-28 bg-slate-100 rounded-xl" />
                      </div>
                    </div>
                  )}

                  {/* ─── ĐÃ CHECK-IN → Summary Card ─── */}
                  {!isLoadingMood && todayMood && (() => {
                    const cfg = getMoodConfig(todayMood.mood);
                    const MoodIcon = cfg?.icon || Sun;
                    return (
                      <div className={`rounded-xl p-5 border ${cfg?.bgLight || 'bg-slate-50 border-slate-200'} transition-all duration-300`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-bold text-slate-800">
                              Đã chia sẻ hôm nay
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(todayMood.createdAt)}
                          </div>
                        </div>

                        {/* Mood Display */}
                        <div className="flex items-center gap-3.5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg?.iconBg}`}>
                            <MoodIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className={`text-lg font-bold ${cfg?.textColor}`}>
                              {cfg?.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {cfg?.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Feedback text nếu có */}
                        {todayMood.feedbackText && (
                          <div className="mt-4 bg-white/80 rounded-lg p-3.5 border border-slate-200/80">
                            <p className="text-sm text-slate-700 italic leading-relaxed">
                              &ldquo;{todayMood.feedbackText}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          Cảm ơn bạn đã chia sẻ. Hẹn gặp lại ngày mai!
                        </p>
                      </div>
                    );
                  })()}

                  {/* ─── CHƯA CHECK-IN → Widget chọn mood ─── */}
                  {!isLoadingMood && !todayMood && (
                    <div>
                      {/* Header */}
                      <div className="mb-5">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          Hôm nay bạn <span className="text-blue-600">cảm thấy</span> thế nào?
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Chia sẻ tâm trạng hàng ngày để công ty có thể đồng hành và hỗ trợ bạn tốt nhất
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
                              type="button"
                              onClick={() => {
                                setSelectedMood(
                                  selectedMood === mood.value ? null : mood.value,
                                );
                                setErrorMsg('');
                              }}
                              disabled={isSubmitting || submitSuccess}
                              className={`
                                relative rounded-xl p-4 text-center border transition-all duration-200
                                ${
                                  isSelected
                                    ? `${mood.activeBorder} shadow-sm z-10 scale-[1.02]`
                                    : hasSelection
                                      ? 'border-slate-200 bg-slate-50/60 opacity-60 scale-[0.98]'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-xs'
                                }
                                ${isSubmitting || submitSuccess ? 'pointer-events-none' : 'cursor-pointer'}
                              `}
                            >
                              <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${mood.iconBg}`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <p className={`text-sm font-bold ${isSelected ? mood.textColor : 'text-slate-900'}`}>
                                {mood.label}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                {mood.subtitle}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Textarea — Progressive Disclosure ── */}
                      <div
                        className={`
                          overflow-hidden transition-all duration-300 ease-out
                          ${selectedMood ? 'max-h-52 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}
                        `}
                      >
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder={currentMoodConfig?.placeholder}
                          disabled={isSubmitting || submitSuccess}
                          rows={3}
                          className="
                            w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg
                            text-sm text-slate-800 placeholder-slate-400 leading-relaxed
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            resize-none transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        />
                      </div>

                      {/* ── Error Message ── */}
                      {errorMsg && (
                        <div className="mt-3 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                          <p className="text-xs text-rose-700 font-medium">{errorMsg}</p>
                        </div>
                      )}

                      {/* ── Submit Button — 3 trạng thái ── */}
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
                              <Check className="w-4 h-4" />
                              Đã ghi nhận thành công!
                            </>
                          ) : isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang gửi dữ liệu...
                            </>
                          ) : (
                            'Chia sẻ cảm nhận hôm nay →'
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
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs h-full flex flex-col justify-between">
                  {/* ── Top: Trạng thái hôm nay ── */}
                  <div className="text-center">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                      <Heart className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      Trạng thái hôm nay
                    </p>
                    <div className="mt-2">
                      {isLoadingMood ? (
                        <div className="animate-pulse mx-auto w-24 h-6 bg-slate-200 rounded-full" />
                      ) : todayMood ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700">Đã chia sẻ</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {formatTime(todayMood.createdAt)} · {getMoodConfig(todayMood.mood)?.label}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-xs font-semibold text-slate-600">Chưa chia sẻ</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Chọn tâm trạng bên trái
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Bottom: Mood History 7 ngày ── */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mb-2.5">
                      7 ngày gần đây
                    </p>
                    {isLoadingMood ? (
                      <div className="animate-pulse flex justify-center gap-2.5">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                            <div className="w-4 h-2 rounded bg-slate-200" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2.5">
                        {getLast7Days().map((day, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 group" title={
                            day.mood
                              ? `${day.dayName}: ${getMoodConfig(day.mood)?.label}`
                              : `${day.dayName}: Chưa check-in`
                          }>
                            {/* Mood Dot */}
                            <div
                              className={`
                                w-3.5 h-3.5 rounded-full transition-all duration-200
                                ${day.mood
                                  ? `${MOOD_DOT_COLORS[day.mood]} shadow-xs group-hover:scale-125`
                                  : 'border-2 border-slate-300 bg-white'
                                }
                                ${day.isToday ? 'ring-2 ring-blue-500/30 ring-offset-1' : ''}
                              `}
                            />
                            {/* Day Label */}
                            <span className={`text-[9px] font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-400'}`}>
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
              {/* AI COPILOT CHAT (col-span-1)                          */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-1">
                <CopilotChatWidget />
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* KHÓA HỌC L&D (col-span-3)                             */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="lg:col-span-3">
                <EmployeeTrainingsWidget />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 2. GÓC NHÌN QUẢN LÝ (MANAGER, HR, SUPERADMIN)             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {(user?.role === 'MANAGER' || user?.role === 'HR' || user?.role === 'SUPERADMIN') && (
          <div className="space-y-6">
            {/* Thanh Tab Chuyển Đổi Nhanh Dành Cho Quản Lý */}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <OnboardingChecklistWidget />
                </div>
                <div className="lg:col-span-1">
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