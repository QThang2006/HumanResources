import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import { onboardingApi } from '../api/onboarding.api';

type TrainingStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
type TrainingCourseType = 'MANDATORY' | 'AI_SKILL_GAP' | 'SOFT_SKILL';

interface EmployeeTraining {
  id: number;
  courseId: number;
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
  AI_SKILL_GAP: 'AI CHỈ ĐỊNH',
  SOFT_SKILL: 'Kỹ năng mềm',
};

const TYPE_CLASSES: Record<TrainingCourseType, string> = {
  MANDATORY: 'bg-rose-50 text-rose-700 border-rose-200',
  AI_SKILL_GAP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SOFT_SKILL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_LABELS: Record<TrainingStatus, string> = {
  ASSIGNED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Hoàn thành',
};

export function EmployeeTrainingsWidget() {
  const [trainings, setTrainings] = useState<EmployeeTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadTrainings = useCallback(async () => {
    try {
      setError('');

      const response = await onboardingApi.getTrainings();

      const items = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
          ? (response as any).data
          : [];

      setTrainings(items as EmployeeTraining[]);
    } catch {
      setError('Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrainings();
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

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Đang tải khóa học...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Khóa học & Phát triển
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            Các khóa học được phân công cho bạn
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          {trainings.length} khóa học
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {trainings.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl py-10 text-center">
          <BookOpen className="w-7 h-7 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Chưa có khóa học được phân công
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Khóa học mới sẽ xuất hiện tại đây khi được Admin hoặc HR phân công.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trainings.map((training) => {
            const isUpdating = updatingId === training.id;
            const type = training.type ?? 'MANDATORY';

            return (
              <div
                key={training.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          TYPE_CLASSES[type]
                        }`}
                      >
                        {TYPE_LABELS[type]}
                      </span>

                      <span className="text-xs text-slate-400">
                        {training.durationHours ?? 10} giờ
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900">
                      {training.title}
                    </h4>

                    {training.skillsProvided?.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        Kỹ năng: {training.skillsProvided.join(', ')}
                      </p>
                    )}

                    {training.aiReason && (
                      <p className="mt-2 text-xs text-indigo-600">
                        AI đề xuất: {training.aiReason}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {STATUS_LABELS[training.status]}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-medium text-slate-500">
                      Tiến độ
                    </span>
                    <span className="font-bold text-slate-900">
                      {training.progressPercent}%
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, training.progressPercent),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {training.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => void updateProgress(training.id, 1)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      Bắt đầu
                    </button>
                  )}

                  {training.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => void updateProgress(training.id, 100)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn tất
                    </button>
                  )}

                  {training.courseUrl && (
                    <a
                      href={training.courseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Vào học
                    </a>
                  )}

                  {training.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã hoàn thành
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}