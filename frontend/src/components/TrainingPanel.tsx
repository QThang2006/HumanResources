import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  LayoutGrid,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';

import {
  trainingApi,
  type TrainingAiReadiness,
  type TrainingAiSuggestion,
  type TrainingAssignment,
  type TrainingCourse,
  type TrainingCourseType,
  type TrainingStatus,
  type TrainingSummary,
} from '../api/training.api';
import { usersApi } from '../api/users.api';
import type { User } from '../types';

const COURSE_TYPE_LABELS: Record<TrainingCourseType, string> = {
  MANDATORY: 'BẮT BUỘC',
  AI_SKILL_GAP: 'AI ĐỀ XUẤT',
  SOFT_SKILL: 'KỸ NĂNG MỀM',
};

const PRIORITY_LABELS: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH: 'Ưu tiên cao',
  MEDIUM: 'Ưu tiên vừa',
  LOW: 'Ưu tiên thấp',
};

const COURSE_TYPE_STYLES: Record<TrainingCourseType, string> = {
  MANDATORY: 'border-[#EDC7CC] bg-[#FBF1F2] text-[#9D4150]',
  AI_SKILL_GAP: 'border-[#E6D7BF] bg-[#FBF6ED] text-[#936A38]',
  SOFT_SKILL: 'border-[#D7D4E8] bg-[#F5F3FA] text-[#6A5D8E]',
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Đã giao',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Hoàn thành',
};

type TrainingWorkspace = 'setup' | 'catalog' | 'progress';
type CourseFilter = 'ALL' | TrainingCourseType;
type AssignmentFilter = 'ALL' | TrainingStatus;

const dateInputValue = (daysFromToday: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TrainingPanel: React.FC = () => {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [summary, setSummary] = useState<TrainingSummary>({
    totalAssignments: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    averageProgress: 0,
    completionRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [aiSuggestion, setAiSuggestion] =
    useState<TrainingAiSuggestion | null>(null);
  const [aiReadiness, setAiReadiness] =
    useState<TrainingAiReadiness | null>(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingDueId, setUpdatingDueId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [activeWorkspace, setActiveWorkspace] =
    useState<TrainingWorkspace>('setup');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('ALL');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>('ALL');
  const [referenceTime] = useState(() =>
    new Date(`${dateInputValue(0)}T00:00:00`).getTime(),
  );

  const [title, setTitle] = useState('');
  const [courseType, setCourseType] =
    useState<TrainingCourseType>('MANDATORY');
  const [skills, setSkills] = useState('');
  const [courseUrl, setCourseUrl] = useState('');
  const [durationHours, setDurationHours] = useState('10');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignmentDueAt, setAssignmentDueAt] = useState(() => dateInputValue(30));
  const [assignedByAi, setAssignedByAi] = useState(false);
  const [aiReason, setAiReason] = useState('');

  const employees = useMemo(
    () => users.filter(user => user.role === 'EMPLOYEE'),
    [users],
  );

  const loadData = useCallback(async () => {
    try {
      const [courseData, assignmentData, summaryData, userData] =
        await Promise.all([
          trainingApi.getCourses(),
          trainingApi.getAssignments(),
          trainingApi.getSummary(),
          usersApi.getAll(),
        ]);

      setCourses(courseData);
      setAssignments(assignmentData);
      setSummary(summaryData);
      setUsers(userData);
    } catch (error) {
      console.error(error);
      setMessage('Không thể tải dữ liệu đào tạo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadData]);

  const handleCreateCourse = async () => {
    if (!title.trim()) {
      setMessage('Vui lòng nhập tên khóa học.');
      return;
    }

    const skillList = skills
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (skillList.length === 0) {
      setMessage('Vui lòng nhập ít nhất một kỹ năng.');
      return;
    }

    try {
      setSavingCourse(true);
      setMessage('');

      await trainingApi.createCourse({
        title: title.trim(),
        type: courseType,
        skillsProvided: skillList,
        courseUrl: courseUrl.trim() || undefined,
        durationHours: Math.max(1, Number(durationHours) || 1),
      });

      setTitle('');
      setSkills('');
      setCourseUrl('');
      setDurationHours('10');
      setCourseType('MANDATORY');
      setMessage('Đã tạo khóa học thành công.');
      await loadData();
      setActiveWorkspace('catalog');
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : 'Không thể tạo khóa học.',
      );
    } finally {
      setSavingCourse(false);
    }
  };
  const handleAiSuggestCourse = async () => {
    if (!selectedUserId) {
      setMessage('Vui lòng chọn nhân viên trước khi dùng AI.');
      return;
    }

    try {
      setAiSuggesting(true);
      setMessage('');

      const suggestion = await trainingApi.aiSuggestCourse(
          Number(selectedUserId),
      );

      setAiSuggestion(suggestion);
      setSelectedCourseId(
        suggestion.courseId === null ? '' : String(suggestion.courseId),
      );
      setAssignedByAi(suggestion.hasMatchingCourse);
      setAiReason(
        suggestion.analysisMode === 'PRELIMINARY'
          ? `Phân tích sơ bộ (chưa có KPI): ${suggestion.reason}`
          : suggestion.reason,
      );

      setMessage(
        suggestion.hasMatchingCourse
          ? suggestion.analysisMode === 'PRELIMINARY'
            ? `AI đã phân tích sơ bộ và đề xuất khóa "${suggestion.courseTitle}". Vui lòng kiểm tra trước khi gán.`
            : `AI đã đề xuất khóa "${suggestion.courseTitle}". Vui lòng kiểm tra trước khi gán.`
          : suggestion.analysisMode === 'PRELIMINARY'
            ? 'AI đã phân tích sơ bộ nhưng kho hiện tại chưa có khóa học phù hợp.'
            : 'AI đã phân tích khoảng trống năng lực nhưng kho hiện tại chưa có khóa học phù hợp.',
      );
    } catch (error) {
      console.error(error);

      setAssignedByAi(false);
      setAiReason('');
      setAiSuggestion(null);

      setMessage(
          error instanceof Error
              ? error.message
              : 'AI chưa thể đề xuất khóa học.',
      );
    } finally {
      setAiSuggesting(false);
    }
  };
  const handleEmployeeChange = async (userId: string) => {
    setSelectedUserId(userId);
    setSelectedCourseId('');
    setAssignedByAi(false);
    setAiReason('');
    setAiSuggestion(null);
    setAiReadiness(null);
    setMessage('');

    if (!userId) return;

    try {
      setCheckingReadiness(true);
      const readiness = await trainingApi.getAiReadiness(Number(userId));
      setAiReadiness(readiness);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể kiểm tra dữ liệu phân tích của nhân viên.',
      );
    } finally {
      setCheckingReadiness(false);
    }
  };
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);

    if (
      aiSuggestion &&
      String(aiSuggestion.courseId ?? '') !== courseId
    ) {
      setAiSuggestion(null);
      setAssignedByAi(false);
      setAiReason('');
    }
  };
  const handleAssignCourse = async () => {
    if (!selectedUserId || !selectedCourseId) {
      setMessage('Vui lòng chọn nhân viên và khóa học.');
      return;
    }

    try {
      setAssigning(true);
      setMessage('');

      await trainingApi.assignCourse({
        userId: Number(selectedUserId),
        courseId: Number(selectedCourseId),
        assignedByAi,
        aiReason:
          assignedByAi && aiReason.trim() ? aiReason.trim() : undefined,
        dueAt: assignmentDueAt,
      });

      setSelectedUserId('');
      setSelectedCourseId('');
      setAssignedByAi(false);
      setAiReason('');
      setAssignmentDueAt(dateInputValue(30));
      setAiSuggestion(null);
      setAiReadiness(null);
      setMessage('Đã gán khóa học cho nhân viên.');
      await loadData();
      setActiveWorkspace('progress');
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : 'Không thể gán khóa học.',
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleProgressChange = async (
    assignmentId: number,
    progressPercent: number,
  ) => {
    try {
      setUpdatingId(assignmentId);
      setMessage('');
      await trainingApi.updateProgress(assignmentId, progressPercent);
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage('Không thể cập nhật tiến độ.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDueDateChange = async (
    assignmentId: number,
    dueAt: string,
  ) => {
    if (!dueAt) return;
    try {
      setUpdatingDueId(assignmentId);
      setMessage('');
      await trainingApi.updateDueDate(assignmentId, dueAt);
      setMessage('Đã cập nhật hạn hoàn thành.');
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật hạn hoàn thành.',
      );
    } finally {
      setUpdatingDueId(null);
    }
  };

  const isSuccessMessage =
    message.startsWith('Đã ') || message.toLowerCase().includes('thành công');

  const courseStats = useMemo(() => {
    return {
      mandatory: courses.filter(course => course.type === 'MANDATORY').length,
      ai: courses.filter(course => course.type === 'AI_SKILL_GAP').length,
      soft: courses.filter(course => course.type === 'SOFT_SKILL').length,
    };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const keyword = courseSearch.trim().toLocaleLowerCase('vi');

    return courses.filter(course => {
      const matchesType =
        courseFilter === 'ALL' || course.type === courseFilter;
      const matchesKeyword =
        !keyword ||
        course.title.toLocaleLowerCase('vi').includes(keyword) ||
        course.skillsProvided.some(skill =>
          skill.toLocaleLowerCase('vi').includes(keyword),
        );

      return matchesType && matchesKeyword;
    });
  }, [courseFilter, courseSearch, courses]);

  const filteredAssignments = useMemo(() => {
    const keyword = assignmentSearch.trim().toLocaleLowerCase('vi');

    return assignments.filter(assignment => {
      const matchesStatus =
        assignmentFilter === 'ALL' ||
        assignment.status === assignmentFilter;
      const matchesKeyword =
        !keyword ||
        assignment.user.fullName.toLocaleLowerCase('vi').includes(keyword) ||
        assignment.user.email.toLocaleLowerCase('vi').includes(keyword) ||
        assignment.course.title.toLocaleLowerCase('vi').includes(keyword);

      return matchesStatus && matchesKeyword;
    });
  }, [assignmentFilter, assignmentSearch, assignments]);

  const dueSoonCount = useMemo(() => {
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    return assignments.filter(assignment => {
      if (
        assignment.status === 'COMPLETED' ||
        !assignment.dueAt ||
        assignment.progressPercent >= 50
      ) {
        return false;
      }

      const dueTime = new Date(assignment.dueAt).getTime();
      return (
        Number.isFinite(dueTime) &&
        dueTime >= referenceTime &&
        dueTime - referenceTime <= threeDays
      );
    }).length;
  }, [assignments, referenceTime]);

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 rounded-[24px] border border-[#E2E5E7] bg-white text-[#82898E] shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-semibold">Đang tải dữ liệu đào tạo...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm ${
            isSuccessMessage
              ? 'border-[#CDE3D6] text-[#2F6B4F]'
              : 'border-[#E8D5B8] text-[#936A38]'
          }`}
        >
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E7D9DD] bg-[#FAF3F5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#6F3042]">
                <Sparkles className="h-3.5 w-3.5" />
                Trung tâm học tập nội bộ
              </div>
              <h2 className="text-xl font-black tracking-tight text-[#1D2023]">
                Đào tạo & Phát triển
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#72797E]">
              Thiết kế khóa học, phân tích năng lực và theo dõi tiến độ
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8DCDE] bg-white px-3.5 text-xs font-black text-[#666D72] transition hover:bg-[#F2F4F4]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </button>
          </div>
        </div>

        <div className="grid divide-y divide-[#E8EAEC] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricCard
            label="Khóa học"
            value={courses.length}
            sub={`${courseStats.mandatory} bắt buộc`}
            icon={<BookOpen className="h-4 w-4" />}
          />
          <MetricCard
            label="Lượt đào tạo"
            value={summary.totalAssignments}
            sub={`${summary.inProgress} đang học · ${summary.averageProgress}% trung bình`}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="Hoàn thành"
            value={summary.completed}
            sub={`${summary.completionRate}% hoàn thành`}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <MetricCard
            label="Cần chú ý"
            value={dueSoonCount}
            sub="Sắp đến hạn, tiến độ dưới 50%"
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </div>
      </section>

      <section className="rounded-[22px] border border-[#E2E5E7] bg-[#F8F9F9] p-2 shadow-[0_8px_24px_rgba(45,34,28,0.04)]">
        <div className="grid gap-2 md:grid-cols-3">
          <WorkspaceTab
            active={activeWorkspace === 'setup'}
            icon={<Sparkles className="h-4 w-4" />}
            title="Thiết lập & Đề xuất"
            description="Tạo khóa và gán lộ trình"
            onClick={() => setActiveWorkspace('setup')}
          />
          <WorkspaceTab
            active={activeWorkspace === 'catalog'}
            icon={<LayoutGrid className="h-4 w-4" />}
            title="Danh mục khóa học"
            description={`${courses.length} khóa · ${courseStats.ai} khóa AI`}
            onClick={() => setActiveWorkspace('catalog')}
          />
          <WorkspaceTab
            active={activeWorkspace === 'progress'}
            icon={<ListChecks className="h-4 w-4" />}
            title="Theo dõi tiến độ"
            description={`${summary.inProgress} đang học · ${dueSoonCount} cần chú ý`}
            onClick={() => setActiveWorkspace('progress')}
          />
        </div>
      </section>

      {activeWorkspace === 'setup' && (
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[24px] border border-[#E2E5E7] bg-white p-5 shadow-[0_12px_34px_rgba(45,34,28,0.055)] sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6E9ED] text-[#6F3042]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#202326]">Tạo khóa học</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="Tên khóa học">
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Ví dụ: An toàn thông tin 2026"
                className={inputClass}
              />
            </FormField>

            <FormField label="Loại khóa học">
              <select
                value={courseType}
                onChange={event =>
                  setCourseType(event.target.value as TrainingCourseType)
                }
                className={inputClass}
              >
                <option value="MANDATORY">BẮT BUỘC</option>
                <option value="AI_SKILL_GAP">AI ĐỀ XUẤT THEO NĂNG LỰC</option>
                <option value="SOFT_SKILL">KỸ NĂNG MỀM</option>
              </select>
            </FormField>

            <FormField label="Kỹ năng">
              <input
                value={skills}
                onChange={event => setSkills(event.target.value)}
                placeholder="Excel, giao tiếp, quản lý thời gian"
                className={inputClass}
              />
            </FormField>

            <FormField label="Thời lượng">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={durationHours}
                  onChange={event => setDurationHours(event.target.value)}
                  placeholder="10"
                  className={`${inputClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#90979C]">
                  giờ
                </span>
              </div>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Đường dẫn khóa học">
                <input
                  value={courseUrl}
                  onChange={event => setCourseUrl(event.target.value)}
                  placeholder="Không bắt buộc"
                  className={inputClass}
                />
              </FormField>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateCourse}
            disabled={savingCourse}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6F3042] px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(111,48,66,0.16)] transition hover:bg-[#5D2737] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingCourse ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tạo khóa học
          </button>
        </div>

        <div className="rounded-[24px] border border-[#E2E5E7] bg-white p-5 shadow-[0_12px_34px_rgba(45,34,28,0.055)] sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF1F1] text-[#A26D3F]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#202326]">Gán khóa học</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="Nhân viên">
              <select
                value={selectedUserId}
                onChange={event => handleEmployeeChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Chọn nhân viên</option>
                {employees.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} - {user.email}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Khóa học">
              <select
                value={selectedCourseId}
                onChange={event => handleCourseChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Chọn khóa học</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Hạn hoàn thành">
                <input
                  type="date"
                  min={dateInputValue(1)}
                  value={assignmentDueAt}
                  onChange={event => setAssignmentDueAt(event.target.value)}
                  className={inputClass}
                />
              </FormField>
              <p className="mt-1.5 text-xs font-semibold text-[#82898E]">
                Hệ thống tự động nhắc khi khóa bắt buộc còn tối đa 3 ngày và tiến độ dưới 50%.
              </p>
            </div>
          </div>

          {checkingReadiness && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#E2E5E7] bg-[#F8F9F9] px-4 py-3 text-sm font-semibold text-[#666D72]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang kiểm tra dữ liệu nhân viên...
            </div>
          )}

          {aiReadiness && !aiReadiness.canAnalyze && (
            <div className="mt-4 rounded-2xl border border-[#E8D5B8] bg-[#FBF6ED] px-4 py-3 text-sm text-[#7A572F]">
              <div className="flex items-start gap-2 font-black">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Chưa đủ dữ liệu để phân tích khoảng trống năng lực
              </div>
              <p className="mt-1 pl-6 text-xs font-semibold leading-5">
                Cần bổ sung: {aiReadiness.missingData.join(', ')}.
              </p>
            </div>
          )}

          {aiReadiness?.canAnalyze && !aiReadiness.hasPerformanceReviews && !aiSuggestion && (
            <div className="mt-4 rounded-2xl border border-[#E8D5B8] bg-[#FBF6ED] px-4 py-3 text-sm text-[#7A572F]">
              <div className="flex items-start gap-2 font-black">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Phân tích sơ bộ — chưa có dữ liệu KPI
              </div>
              <p className="mt-1 pl-6 text-xs font-semibold leading-5">
                Dựa trên chức danh, phòng ban, lịch sử đào tạo và kỹ năng. Kết quả chỉ mang tính gợi ý phát triển.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 pl-6 text-xs">
                <span><strong>{aiReadiness.trainingHistoryCount}</strong> lượt đào tạo</span>
                <span><strong>{aiReadiness.availableCourseCount}</strong> khóa có thể đề xuất</span>
              </div>
            </div>
          )}

          {aiReadiness?.canAnalyze && aiReadiness.hasPerformanceReviews && !aiSuggestion && (
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#DCE5DF] bg-[#F4F8F5] p-3 text-xs text-[#496154]">
              <span><strong>{aiReadiness.reviewCount}</strong> lần đánh giá hiệu suất</span>
              <span>Điểm hiệu suất mới nhất: <strong>{aiReadiness.latestKpiScore ?? '—'}</strong></span>
              <span><strong>{aiReadiness.trainingHistoryCount}</strong> lượt đào tạo</span>
              <span><strong>{aiReadiness.availableCourseCount}</strong> khóa có thể đề xuất</span>
            </div>
          )}

          <button
              type="button"
              onClick={handleAiSuggestCourse}
              disabled={!selectedUserId || checkingReadiness || !aiReadiness?.canAnalyze || aiSuggesting}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E6D7BF] bg-[#FBF6ED] px-4 text-sm font-black text-[#936A38] transition hover:bg-[#F5EAD8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiSuggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <BrainCircuit className="h-4 w-4" />
            )}

            {aiSuggesting
                ? 'AI đang phân tích...'
                : 'Phân tích năng lực bằng AI'}
          </button>

          {aiSuggestion && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#D8CCC2] bg-[#FCFAF7]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED5] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-black text-[#6F3042]">
                  <BrainCircuit className="h-4 w-4" />
                  {aiSuggestion.analysisMode === 'PRELIMINARY'
                    ? 'Kết quả phân tích sơ bộ'
                    : 'Kết quả phân tích khoảng trống năng lực'}
                </div>
                <span className="rounded-full bg-[#6F3042] px-3 py-1 text-[10px] font-black text-white">
                  {aiSuggestion.analysisMode === 'PRELIMINARY'
                    ? 'Điểm tham khảo'
                    : 'Mức sẵn sàng'}{' '}
                  {aiSuggestion.readinessScore}/100
                </span>
              </div>

              <div className="space-y-4 p-4 text-sm">
                {aiSuggestion.analysisMode === 'PRELIMINARY' && (
                  <div className="rounded-xl border border-[#E8D5B8] bg-[#FBF6ED] px-3 py-2 text-xs font-semibold leading-5 text-[#7A572F]">
                    {aiSuggestion.dataNotice ||
                      'Phân tích sơ bộ — chưa có dữ liệu KPI. Kết quả chỉ mang tính gợi ý phát triển.'}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#8B8179]">
                    {aiSuggestion.analysisMode === 'PRELIMINARY'
                      ? 'Kỹ năng nên phát triển'
                      : 'Khoảng trống kỹ năng'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {aiSuggestion.skillGaps.map(skill => (
                      <span key={skill} className="rounded-full border border-[#E6D7BF] bg-white px-2.5 py-1 text-xs font-bold text-[#7A572F]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#8B8179]">
                    {aiSuggestion.analysisMode === 'PRELIMINARY'
                      ? 'Nhận định sơ bộ'
                      : 'Đánh giá tổng quan'}
                  </p>
                  <p className="mt-1 leading-6 text-[#454B4F]">{aiSuggestion.summary}</p>
                </div>

                <div className="rounded-xl border border-[#E6D7BF] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#8B8179]">
                        {aiSuggestion.hasMatchingCourse ? 'Khóa học đề xuất' : 'Trạng thái kho khóa học'}
                      </p>
                      <p className="mt-1 font-black text-[#202326]">
                        {aiSuggestion.courseTitle ?? 'Chưa có khóa học phù hợp'}
                      </p>
                    </div>
                    {aiSuggestion.priority && (
                      <span className="rounded-full bg-[#FBF1F2] px-2.5 py-1 text-[10px] font-black text-[#9D4150]">
                        {PRIORITY_LABELS[aiSuggestion.priority]}
                      </span>
                    )}
                  </div>
                  {aiSuggestion.estimatedTimeToComplete && (
                    <p className="mt-2 text-xs font-semibold text-[#716A64]">Thời gian: {aiSuggestion.estimatedTimeToComplete}</p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-[#53595E]">{aiSuggestion.reason}</p>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#8B8179]">Định hướng phát triển</p>
                  <p className="mt-1 leading-6 text-[#454B4F]">{aiSuggestion.careerAdvice}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAssignCourse}
            disabled={assigning || !selectedUserId || !selectedCourseId}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#202326] px-5 text-sm font-black text-white transition hover:bg-[#171412] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {assigning
              ? 'Đang gán...'
              : aiSuggestion
                ? 'Duyệt & Gán khóa học'
                : 'Gán khóa học'}
          </button>
        </div>
      </section>
      )}

      {activeWorkspace === 'catalog' && (
      <section className="rounded-[24px] border border-[#E2E5E7] bg-white p-5 shadow-[0_12px_34px_rgba(45,34,28,0.055)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[#E8EAEC] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-[#202326]">Danh mục khóa học</h3>
            <p className="mt-1 text-xs font-semibold text-[#82898E]">
              Tìm nhanh theo tên khóa học hoặc kỹ năng cung cấp.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
              <input
                value={courseSearch}
                onChange={event => setCourseSearch(event.target.value)}
                placeholder="Tìm khóa học, kỹ năng..."
                className={`${inputClass} pl-10`}
              />
            </div>
            <select
              value={courseFilter}
              onChange={event =>
                setCourseFilter(event.target.value as CourseFilter)
              }
              className={`${inputClass} sm:w-48`}
            >
              <option value="ALL">Tất cả loại khóa học</option>
              <option value="MANDATORY">Bắt buộc</option>
              <option value="AI_SKILL_GAP">AI đề xuất</option>
              <option value="SOFT_SKILL">Kỹ năng mềm</option>
            </select>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#D6DADC] bg-[#F8F9F9] px-5 py-10 text-center">
            <BookOpen className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-black text-[#53595E]">Chưa có khóa học</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="mt-5 rounded-[18px] border border-dashed border-[#D6DADC] bg-[#F8F9F9] px-5 py-10 text-center">
            <Search className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-black text-[#53595E]">
              Không tìm thấy khóa học phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setCourseSearch('');
                setCourseFilter('ALL');
              }}
              className="mt-3 text-xs font-black text-[#6F3042] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredCourses.map(course => (
              <article
                key={course.id}
                className="group rounded-[18px] border border-[#E3E6E7] bg-[#FFFFFF] p-4 transition hover:-translate-y-0.5 hover:border-[#D8CCC2] hover:bg-white hover:shadow-[0_10px_24px_rgba(45,34,28,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${COURSE_TYPE_STYLES[course.type]}`}
                  >
                    {COURSE_TYPE_LABELS[course.type]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#82898E]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {course.durationHours} giờ
                  </span>
                </div>

                <h4 className="mt-4 text-[15px] font-black leading-5 text-[#202326]">
                  {course.title}
                </h4>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {course.skillsProvided.slice(0, 4).map(skill => (
                    <span
                      key={skill}
                      className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#716A64] ring-1 ring-inset ring-[#E2E5E6]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#E7E9EA] pt-3">
                  <span className="text-[11px] text-[#90979C]">Đã gán</span>
                  <span className="text-sm font-black text-[#6F3042]">{course.assignmentCount}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {activeWorkspace === 'progress' && (
      <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-black text-[#202326]">Tiến độ đào tạo</h3>
              <p className="mt-1 text-xs font-semibold text-[#82898E]">
                Theo dõi hạn hoàn thành, số lần nhắc và trạng thái của từng nhân viên.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
                <input
                  value={assignmentSearch}
                  onChange={event => setAssignmentSearch(event.target.value)}
                  placeholder="Tìm nhân viên, khóa học..."
                  className={`${inputClass} pl-10`}
                />
              </div>
              <select
                value={assignmentFilter}
                onChange={event =>
                  setAssignmentFilter(event.target.value as AssignmentFilter)
                }
                className={`${inputClass} sm:w-44`}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ASSIGNED">Đã giao</option>
                <option value="IN_PROGRESS">Đang học</option>
                <option value="COMPLETED">Hoàn thành</option>
              </select>
            </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm font-semibold text-[#82898E]">Chưa có lượt đào tạo nào.</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Search className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-black text-[#53595E]">
              Không có lượt đào tạo phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setAssignmentSearch('');
                setAssignmentFilter('ALL');
              }}
              className="mt-3 text-xs font-black text-[#6F3042] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E8EAEC] bg-[#F8F9F9]">
                  {['Nhân viên', 'Khóa học', 'Loại', 'Hạn hoàn thành', 'Tiến độ', 'Trạng thái'].map(column => (
                    <th
                      key={column}
                      className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-[#90979C] sm:px-7"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E9ECEC]">
                {filteredAssignments.map(assignment => {
                  const progress = Math.max(0, Math.min(100, assignment.progressPercent));

                  return (
                    <tr key={assignment.id} className="transition hover:bg-[#FFFFFF]">
                      <td className="px-5 py-4 sm:px-7">
                        <p className="text-sm font-black text-[#303438]">{assignment.user.fullName}</p>
                        <p className="mt-0.5 text-xs text-[#82898E]">{assignment.user.email}</p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#636A70] sm:px-7">
                        {assignment.course.title}
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${COURSE_TYPE_STYLES[assignment.course.type]}`}>
                          {COURSE_TYPE_LABELS[assignment.course.type]}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-[#636A70] sm:px-7">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            min={dateInputValue(1)}
                            value={assignment.dueAt
                              ? new Date(assignment.dueAt).toLocaleDateString('en-CA')
                              : ''}
                            disabled={updatingDueId === assignment.id}
                            onChange={event =>
                              handleDueDateChange(assignment.id, event.target.value)
                            }
                            className="h-8 rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-2 text-xs font-bold outline-none focus:border-[#8A4153] disabled:opacity-50"
                          />
                          {updatingDueId === assignment.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                        </div>
                        {assignment.reminderCount > 0 && (
                          <p className="mt-1 text-[10px] font-bold text-[#936A38]">
                            Đã nhắc {assignment.reminderCount} lần
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <div className="flex items-center gap-3">
                          <div className="w-28">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#EAE2DB]">
                              <div
                                className="h-full rounded-full bg-[#B48855] transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[10px] font-bold text-[#82898E]">{progress}%</p>
                          </div>

                          {updatingId === assignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[#6F3042]" />
                          ) : (
                            <select
                              value={assignment.progressPercent}
                              onChange={event =>
                                handleProgressChange(
                                  assignment.id,
                                  Number(event.target.value),
                                )
                              }
                              className="h-8 rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-2 text-xs font-bold text-[#636A70] outline-none focus:border-[#8A4153]"
                            >
                              {[0, 25, 50, 75, 100].map(value => (
                                <option key={value} value={value}>
                                  {value}%
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                          assignment.status === 'COMPLETED'
                            ? 'bg-[#EFF7F1] text-[#2F6B4F]'
                            : assignment.status === 'IN_PROGRESS'
                              ? 'bg-[#FBF6ED] text-[#936A38]'
                              : 'bg-[#F1EEEB] text-[#72797E]'
                        }`}>
                          {STATUS_LABELS[assignment.status] || assignment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
    </div>
  );
};

const WorkspaceTab: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ active, icon, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-left transition ${
      active
        ? 'bg-white text-[#25282B] shadow-[0_8px_22px_rgba(45,34,28,0.08)] ring-1 ring-[#E2E5E7]'
        : 'text-[#72797E] hover:bg-white/70 hover:text-[#303438]'
    }`}
  >
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
        active
          ? 'bg-[#F4E7EB] text-[#6F3042]'
          : 'bg-[#ECEEEE] text-[#858C91]'
      }`}
    >
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-black">{title}</span>
      <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#90979C]">
        {description}
      </span>
    </span>
  </button>
);

const inputClass =
  'h-11 w-full rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] px-3.5 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10';

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-[#90979C]">{label}</span>
    {children}
  </label>
);

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, icon }) => (
  <div className="px-5 py-5 sm:px-7">
    <div className="flex items-center gap-2 text-[#90979C]">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
    </div>
    <div className="mt-3 text-3xl font-black tracking-tight text-[#1D2023]">{value}</div>
    <p className="mt-1 text-[11px] font-semibold text-[#82898E]">{sub}</p>
  </div>
);
