import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  PlayCircle,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { onboardingApi } from '../api/onboarding.api';

type TrainingStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
type TrainingCourseType = 'MANDATORY' | 'AI_SKILL_GAP' | 'SOFT_SKILL';
type TrainingFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

interface EmployeeTraining {
  id: number;
  courseId: number | null;
  isCourseDeleted?: boolean;
  title: string;
  type: TrainingCourseType;
  skillsProvided: string[];
  courseUrl: string | null;
  durationHours: number;
  progressPercent: number;
  status: TrainingStatus;
  assignedByAi: boolean;
  aiReason: string | null;
  completedAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<TrainingCourseType, string> = {
  MANDATORY: 'Bắt buộc',
  AI_SKILL_GAP: 'AI đề xuất',
  SOFT_SKILL: 'Kỹ năng mềm',
};

const TYPE_CLASSES: Record<TrainingCourseType, string> = {
  MANDATORY: 'border-amber-200 bg-amber-50 text-amber-800',
  AI_SKILL_GAP: 'border-primary-200 bg-primary-50 text-primary-700',
  SOFT_SKILL: 'border-slate-200 bg-slate-100 text-slate-700',
};

const STATUS_LABELS: Record<TrainingStatus, string> = {
  ASSIGNED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Hoàn thành',
};

const FILTERS: Array<{ value: TrainingFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
];

export function EmployeeTrainingsWidget() {
  const [trainings, setTrainings] = useState<EmployeeTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<TrainingFilter>('ALL');
  const [error, setError] = useState('');

  const loadTrainings = useCallback(async () => {
    try {
      setError('');

      const response = await onboardingApi.getTrainings();
      const items = Array.isArray(response)
        ? response
        : Array.isArray((response as { data?: unknown[] })?.data)
          ? (response as { data: unknown[] }).data
          : [];

      setTrainings(items as EmployeeTraining[]);
    } catch {
      setError('Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadTrainings();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadTrainings]);

  const updateProgress = async (
    assignmentId: number,
    progressPercent: number,
  ) => {
    try {
      setUpdatingId(assignmentId);
      setError('');
      await onboardingApi.updateTrainingProgress(
        assignmentId,
        progressPercent,
      );
      await loadTrainings();
    } catch {
      setError('Không thể cập nhật tiến độ khóa học.');
    } finally {
      setUpdatingId(null);
    }
  };

  const summary = useMemo(() => {
    const active = trainings.filter(
      training => training.status !== 'COMPLETED',
    ).length;
    const completed = trainings.length - active;
    const average = trainings.length
      ? Math.round(
          trainings.reduce(
            (total, training) => total + training.progressPercent,
            0,
          ) / trainings.length,
        )
      : 0;

    return { active, completed, average };
  }, [trainings]);

  const visibleTrainings = useMemo(() => {
    if (filter === 'ACTIVE') {
      return trainings.filter(training => training.status !== 'COMPLETED');
    }
    if (filter === 'COMPLETED') {
      return trainings.filter(training => training.status === 'COMPLETED');
    }
    return trainings;
  }, [filter, trainings]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-14 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải khóa học...
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200/70 bg-slate-50 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Khóa học & Phát triển
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Theo dõi lộ trình học tập và chủ động cập nhật tiến độ của bạn.
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
            {trainings.length} khóa học
          </span>
        </div>

        {trainings.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <SummaryItem
              icon={<Target className="h-4 w-4" />}
              label="Đang thực hiện"
              value={summary.active}
              tone="indigo"
            />
            <SummaryItem
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Hoàn thành"
              value={summary.completed}
              tone="emerald"
            />
            <SummaryItem
              icon={<TrendingUp className="h-4 w-4" />}
              label="Tiến độ chung"
              value={`${summary.average}%`}
              tone="amber"
            />
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {trainings.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">
              Chưa có khóa học được phân công
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Khóa học mới sẽ xuất hiện khi Admin hoặc HR phân công.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {FILTERS.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                    filter === item.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {visibleTrainings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm font-semibold text-slate-500">
                Không có khóa học trong nhóm này.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleTrainings.map(training => {
                  const isUpdating = updatingId === training.id;
                  const type = training.type ?? 'MANDATORY';
                  const progress = Math.min(
                    100,
                    Math.max(0, training.progressPercent),
                  );
                  const standardProgressValues = [0, 25, 50, 75, 100];
                  const progressValues = standardProgressValues.includes(
                    progress,
                  )
                    ? standardProgressValues
                    : [...standardProgressValues, progress].sort(
                        (left, right) => left - right,
                      );

                  return (
                    <article
                      key={training.id}
                      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-primary-200 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${TYPE_CLASSES[type]}`}
                            >
                              {TYPE_LABELS[type]}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                              <Clock3 className="h-3.5 w-3.5" />
                              {training.durationHours ?? 10} giờ
                            </span>
                          </div>
                          <h4 className="mt-3 text-[15px] font-semibold leading-6 text-slate-900">
                            {training.title}
                          </h4>
                          {training.isCourseDeleted && <p className="mt-1 text-xs leading-5 text-slate-600">Khóa đã xóa khỏi danh mục. Tiến độ và kết quả học vẫn được giữ.</p>}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            training.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : training.status === 'IN_PROGRESS'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {STATUS_LABELS[training.status]}
                        </span>
                      </div>

                      {training.skillsProvided?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {training.skillsProvided.slice(0, 5).map(skill => (
                            <span
                              key={skill}
                              className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {training.aiReason && (
                        <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 px-3.5 py-3 text-xs leading-5 text-primary-700">
                          <span className="inline-flex items-center gap-1.5 font-bold">
                            <Sparkles className="h-3.5 w-3.5" />
                            Lý do đề xuất
                          </span>
                          <p className="mt-1 text-primary-700/80">
                            {training.aiReason}
                          </p>
                        </div>
                      )}

                      <div className="mt-auto pt-5">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-500">
                            Tiến độ
                          </span>
                          <span className="font-semibold text-slate-900">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress === 100
                                ? 'bg-emerald-500'
                                : 'bg-primary-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {training.status === 'ASSIGNED' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                void updateProgress(training.id, 1)
                              }
                              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-3.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                              Bắt đầu
                            </button>
                          )}

                          {training.status !== 'COMPLETED' && (
                            <label className="relative">
                              <span className="sr-only">Cập nhật tiến độ</span>
                              <select
                                value={
                                  training.progressPercent > 0
                                    ? training.progressPercent
                                    : 0
                                }
                                disabled={isUpdating}
                                onChange={event =>
                                  void updateProgress(
                                    training.id,
                                    Number(event.target.value),
                                  )
                                }
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:opacity-50"
                              >
                                {progressValues.map(value => (
                                  <option key={value} value={value}>
                                    {value === progress &&
                                    !standardProgressValues.includes(value)
                                      ? `Hiện tại ${value}%`
                                      : `Cập nhật ${value}%`}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          {training.courseUrl && (
                            <a
                              href={training.courseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3.5 text-xs font-bold text-primary-700 transition hover:bg-primary-100"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Vào học
                            </a>
                          )}

                          {training.status === 'COMPLETED' && (
                            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Đã hoàn thành
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const SummaryItem = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: 'indigo' | 'emerald' | 'amber';
}) => {
  const toneClass = {
    indigo: 'bg-primary-50 text-primary-700 ring-primary-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }[tone];

  return (
    <div className={`rounded-xl p-3 ring-1 ring-inset ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        <span className="break-words">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-semibold sm:text-xl">{value}</p>
    </div>
  );
};
