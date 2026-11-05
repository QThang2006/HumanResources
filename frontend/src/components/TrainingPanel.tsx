import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RotateCcw,
  Trash2,
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
  type TrainingCourseRoster,
  type TrainingStatus,
  type TrainingSummary,
} from '../api/training.api';
import { usersApi } from '../api/users.api';
import type { User } from '../types';
import { CourseLearnersPanel } from './CourseLearnersPanel';
import { CourseRemoveDialog } from './CourseRemoveDialog';
import { CoursePermanentDeleteDialog } from './CoursePermanentDeleteDialog';
import '../styles/tv4-ui.css';

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
  const [aiError, setAiError] = useState('');
  const analysisRequest = useRef<AbortController | null>(null);
  const readinessRequest = useRef<AbortController | null>(null);
  const analysisResultRef = useRef<HTMLDivElement>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingDueId, setUpdatingDueId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [activeWorkspace, setActiveWorkspace] =
    useState<TrainingWorkspace>('setup');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('ALL');
  const [catalogScope, setCatalogScope] = useState<'active' | 'archived'>('active');
  const [viewingCourse, setViewingCourse] = useState<TrainingCourse | null>(null);
  const [roster, setRoster] = useState<TrainingCourseRoster | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const rosterRequest = useRef<AbortController | null>(null);
  const catalogHeadingRef = useRef<HTMLHeadingElement>(null);
  const [pendingRemove, setPendingRemove] = useState<TrainingCourse | null>(null);
  const [courseMutationId, setCourseMutationId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<TrainingCourse | null>(null);
  const [permanentDeleteError, setPermanentDeleteError] = useState('');
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [assignmentCourseId, setAssignmentCourseId] = useState<number | null>(null);
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
  const availableCourses = useMemo(() => courses.filter(course => !course.isArchived), [courses]);
  const archivedCourseCount = courses.length - availableCourses.length;

  const loadData = useCallback(async () => {
    try {
      const [courseData, assignmentData, summaryData, userData] =
        await Promise.all([
          trainingApi.getCourses(true),
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

  useEffect(() => () => rosterRequest.current?.abort(), []);

  useEffect(() => () => {
    analysisRequest.current?.abort();
    readinessRequest.current?.abort();
  }, []);

  useEffect(() => {
    if (aiSuggestion) {
      analysisResultRef.current?.focus();
    }
  }, [aiSuggestion]);

  const handleViewLearners = async (course: TrainingCourse) => {
    rosterRequest.current?.abort();
    const request = new AbortController();
    rosterRequest.current = request;
    setViewingCourse(course);
    setRoster(null);
    setRosterError('');
    setRosterLoading(true);
    setActiveWorkspace('catalog');
    try {
      const response = await trainingApi.getCourseAssignments(course.id, request.signal);
      if (!request.signal.aborted) setRoster(response);
    } catch (error) {
      if (!request.signal.aborted) {
        setRosterError(error instanceof Error ? error.message : 'Không thể tải danh sách người học.');
      }
    } finally {
      if (!request.signal.aborted) setRosterLoading(false);
    }
  };

  const handleBackToCatalog = () => {
    rosterRequest.current?.abort();
    setViewingCourse(null);
    setRoster(null);
    setRosterError('');
    window.requestAnimationFrame(() => catalogHeadingRef.current?.focus());
  };

  const handleRemoveCourse = async () => {
    if (!pendingRemove || courseMutationId !== null) return;
    const course = pendingRemove;
    setCourseMutationId(course.id);
    setRemoveError('');
    try {
      const result = await trainingApi.removeCourse(course.id);
      setCourses(current => current.map(item => item.id === course.id ? { ...item, isArchived: true } : item));
      if (selectedCourseId === String(course.id)) {
        setSelectedCourseId('');
        setAssignedByAi(false);
        setAiReason('');
        setAiSuggestion(null);
      }
      setPendingRemove(null);
      setMessage(result.message);
      window.requestAnimationFrame(() => catalogHeadingRef.current?.focus());
      await loadData();
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : 'Không thể gỡ khóa học. Vui lòng thử lại.');
    } finally {
      setCourseMutationId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!pendingPermanentDelete || permanentDeleting) return;
    const course = pendingPermanentDelete;
    setPermanentDeleting(true);
    setPermanentDeleteError('');
    try {
      const result = await trainingApi.deleteCoursePermanently(course.id);
      setCourses(current => current.filter(item => item.id !== course.id));
      if (selectedCourseId === String(course.id)) {
        setSelectedCourseId('');
        setAssignedByAi(false);
        setAiReason('');
        setAiSuggestion(null);
      }
      setPendingPermanentDelete(null);
      setMessage(result.message);
      window.requestAnimationFrame(() => catalogHeadingRef.current?.focus());
      await loadData();
    } catch (error) {
      setPermanentDeleteError(error instanceof Error ? error.message : 'Không thể xóa vĩnh viễn khóa học. Vui lòng thử lại.');
    } finally {
      setPermanentDeleting(false);
    }
  };

  const handleRestoreCourse = async (course: TrainingCourse) => {
    if (courseMutationId !== null) return;
    setCourseMutationId(course.id);
    setMessage('');
    try {
      const result = await trainingApi.restoreCourse(course.id);
      setCourses(current => current.map(item => item.id === course.id ? { ...item, isArchived: false } : item));
      setMessage(result.message);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể khôi phục khóa học.');
    } finally {
      setCourseMutationId(null);
    }
  };

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
      setCatalogScope('active');
      setViewingCourse(null);
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

    analysisRequest.current?.abort();
    const request = new AbortController();
    analysisRequest.current = request;

    try {
      setAiSuggesting(true);
      setAiError('');
      setAiSuggestion(null);
      setMessage('');

      const suggestion = await trainingApi.aiSuggestCourse(
          Number(selectedUserId),
          request.signal,
      );
      if (request.signal.aborted) return;

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
      if (request.signal.aborted) return;
      console.error(error);

      setAssignedByAi(false);
      setAiReason('');
      setAiSuggestion(null);

      setAiError(
          error instanceof Error
              ? /timeout/i.test(error.message)
                ? 'Phân tích mất quá nhiều thời gian. Hãy kiểm tra kết nối Gemini trong mục Tích hợp rồi thử lại.'
                : error.message
              : 'AI chưa thể đề xuất khóa học.',
      );
    } finally {
      if (!request.signal.aborted) setAiSuggesting(false);
    }
  };
  const handleEmployeeChange = async (userId: string) => {
    analysisRequest.current?.abort();
    readinessRequest.current?.abort();
    setAiSuggesting(false);
    setCheckingReadiness(false);
    setAiError('');
    setSelectedUserId(userId);
    setSelectedCourseId('');
    setAssignedByAi(false);
    setAiReason('');
    setAiSuggestion(null);
    setAiReadiness(null);
    setMessage('');

    if (!userId) return;

    const request = new AbortController();
    readinessRequest.current = request;

    try {
      setCheckingReadiness(true);
      const readiness = await trainingApi.getAiReadiness(Number(userId), request.signal);
      if (!request.signal.aborted) setAiReadiness(readiness);
    } catch (error) {
      if (request.signal.aborted) return;
      console.error(error);
      setAiError(
        error instanceof Error
          ? error.message
          : 'Không thể kiểm tra dữ liệu phân tích của nhân viên.',
      );
    } finally {
      if (!request.signal.aborted) setCheckingReadiness(false);
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
      mandatory: availableCourses.filter(course => course.type === 'MANDATORY').length,
      ai: availableCourses.filter(course => course.type === 'AI_SKILL_GAP').length,
      soft: availableCourses.filter(course => course.type === 'SOFT_SKILL').length,
    };
  }, [availableCourses]);

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

      return Boolean(course.isArchived) === (catalogScope === 'archived') && matchesType && matchesKeyword;
    });
  }, [catalogScope, courseFilter, courseSearch, courses]);

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

      return (assignmentCourseId === null || assignment.course.id === assignmentCourseId) && matchesStatus && matchesKeyword;
    });
  }, [assignmentCourseId, assignmentFilter, assignmentSearch, assignments]);

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
      <div className="flex min-h-80 items-center justify-center gap-3 rounded-2xl border border-[#E2E5E7] bg-white text-[#687178]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-semibold">Đang tải dữ liệu đào tạo...</span>
      </div>
    );
  }

  return (
    <div className="tv4-ui space-y-6">
      <CourseRemoveDialog
        course={pendingRemove}
        busy={courseMutationId !== null}
        error={removeError}
        onCancel={() => { if (courseMutationId === null) { setPendingRemove(null); setRemoveError(''); } }}
        onConfirm={() => void handleRemoveCourse()}
      />
      <CoursePermanentDeleteDialog
        course={pendingPermanentDelete}
        busy={permanentDeleting}
        error={permanentDeleteError}
        onCancel={() => { if (!permanentDeleting) { setPendingPermanentDelete(null); setPermanentDeleteError(''); } }}
        onConfirm={() => void handlePermanentDelete()}
      />
      {message && (
        <div
          role="status"
          className={`rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm ${
            isSuccessMessage
              ? 'border-[#CDE3D6] text-[#2F6B4F]'
              : 'border-[#E8D5B8] text-[#936A38]'
          }`}
        >
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E2E5E7] bg-white">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold tracking-tight text-[#1D2023]">
                Đào tạo & Phát triển
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#687178]">
              Thiết kế khóa học, phân tích năng lực và theo dõi tiến độ
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8DCDE] bg-white px-3.5 text-xs font-semibold text-[#666D72] transition hover:bg-[#F2F4F4]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </button>
          </div>
        </div>

        <div className="tv4-metrics">
          <MetricCard
            label="Khóa học"
            value={availableCourses.length}
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

      <section className="rounded-2xl border border-[#E2E5E7] bg-[#F8F9F9] p-1.5">
        <div className="grid grid-cols-3 gap-1.5">
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
            description={`${availableCourses.length} đang sử dụng · ${archivedCourseCount} đã gỡ`}
            onClick={() => { handleBackToCatalog(); setActiveWorkspace('catalog'); }}
          />
          <WorkspaceTab
            active={activeWorkspace === 'progress'}
            icon={<ListChecks className="h-4 w-4" />}
            title="Theo dõi tiến độ"
            description={`${summary.inProgress} đang học · ${dueSoonCount} cần chú ý`}
            onClick={() => { setAssignmentCourseId(null); setActiveWorkspace('progress'); }}
          />
        </div>
      </section>

      {activeWorkspace === 'setup' && (
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E2E5E7] bg-white p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6E9ED] text-[#6F3042]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#202326]">Tạo khóa học</h3>
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
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#687178]">
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
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6F3042] px-5 text-sm font-semibold text-white transition hover:bg-[#5D2737] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingCourse ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tạo khóa học
          </button>
        </div>

        <div className="rounded-2xl border border-[#E2E5E7] bg-white p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF1F1] text-[#A26D3F]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#202326]">Gán khóa học</h3>
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
                disabled={aiSuggesting}
                value={selectedCourseId}
                onChange={event => handleCourseChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Chọn khóa học</option>
                {availableCourses.map(course => (
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
              <p className="mt-1.5 text-xs font-semibold text-[#687178]">
                Hệ thống tự động nhắc khi khóa bắt buộc còn tối đa 3 ngày và tiến độ dưới 50%.
              </p>
            </div>
          </div>

          {checkingReadiness && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E2E5E7] bg-[#F8F9F9] px-4 py-3 text-sm font-semibold text-[#666D72]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang kiểm tra dữ liệu nhân viên...
            </div>
          )}

          {aiReadiness && !aiReadiness.canAnalyze && (
            <div className="mt-4 rounded-2xl border border-[#E8D5B8] bg-[#FBF6ED] px-4 py-3 text-sm text-[#7A572F]">
              <div className="flex items-start gap-2 font-semibold">
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
              <div className="flex items-start gap-2 font-semibold">
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
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#DCE5DF] bg-[#F4F8F5] p-3 text-xs text-[#496154]">
              <span><strong>{aiReadiness.reviewCount}</strong> lần đánh giá hiệu suất</span>
              <span>Điểm hiệu suất mới nhất: <strong>{aiReadiness.latestKpiScore ?? '—'}</strong></span>
              <span><strong>{aiReadiness.trainingHistoryCount}</strong> lượt đào tạo</span>
              <span><strong>{aiReadiness.availableCourseCount}</strong> khóa có thể đề xuất</span>
            </div>
          )}

          <button
              type="button"
              onClick={handleAiSuggestCourse}
              aria-busy={aiSuggesting}
              aria-describedby={aiError ? 'training-ai-error' : undefined}
              disabled={!selectedUserId || checkingReadiness || !aiReadiness?.canAnalyze || aiSuggesting}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E6D7BF] bg-[#FBF6ED] px-4 text-sm font-semibold text-[#936A38] transition hover:bg-[#F5EAD8] disabled:cursor-not-allowed disabled:opacity-50"
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

          {aiSuggesting && <p role="status" className="mt-3 text-sm leading-6 text-[#636A70]">Đang phân tích hồ sơ và đối chiếu danh mục khóa học. Vui lòng chờ kết quả.</p>}
          {aiError && <p id="training-ai-error" role="alert" className="mt-3 rounded-xl border border-[#EDC7CC] bg-[#FBF1F2] px-4 py-3 text-sm leading-6 text-[#9D4150]">{aiError}</p>}

          {aiSuggestion && (
            <div ref={analysisResultRef} tabIndex={-1} role="region" aria-label={`Kết quả phân tích năng lực: ${aiSuggestion.employeeName}`} className="mt-4 overflow-hidden rounded-2xl border border-[#D8CCC2] bg-[#FCFAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED5] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#6F3042]">
                  <BrainCircuit className="h-4 w-4" />
                  {aiSuggestion.analysisMode === 'PRELIMINARY'
                    ? 'Kết quả phân tích sơ bộ'
                    : 'Kết quả phân tích khoảng trống năng lực'}
                </div>
                <span className="rounded-full bg-[#6F3042] px-3 py-1 text-xs font-semibold text-white">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8179]">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8179]">
                    {aiSuggestion.analysisMode === 'PRELIMINARY'
                      ? 'Nhận định sơ bộ'
                      : 'Đánh giá tổng quan'}
                  </p>
                  <p className="mt-1 leading-6 text-[#454B4F]">{aiSuggestion.summary}</p>
                </div>

                <div className="rounded-xl border border-[#E6D7BF] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8179]">
                        {aiSuggestion.hasMatchingCourse ? 'Khóa học đề xuất' : 'Trạng thái kho khóa học'}
                      </p>
                      <p className="mt-1 font-semibold text-[#202326]">
                        {aiSuggestion.courseTitle ?? 'Chưa có khóa học phù hợp'}
                      </p>
                    </div>
                    {aiSuggestion.priority && (
                      <span className="rounded-full bg-[#FBF1F2] px-2.5 py-1 text-xs font-semibold text-[#9D4150]">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8B8179]">Định hướng phát triển</p>
                  <p className="mt-1 leading-6 text-[#454B4F]">{aiSuggestion.careerAdvice}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAssignCourse}
            disabled={assigning || aiSuggesting || checkingReadiness || !selectedUserId || !selectedCourseId}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#202326] px-5 text-sm font-semibold text-white transition hover:bg-[#171412] disabled:cursor-not-allowed disabled:opacity-50"
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

      {activeWorkspace === 'catalog' && viewingCourse && (
        <CourseLearnersPanel
          key={viewingCourse.id}
          course={roster?.course ?? viewingCourse}
          assignments={roster?.assignments ?? []}
          loading={rosterLoading}
          error={rosterError}
          onBack={handleBackToCatalog}
          onRetry={() => void handleViewLearners(viewingCourse)}
          onManageProgress={() => {
            setAssignmentCourseId(viewingCourse.id);
            setAssignmentSearch('');
            setAssignmentFilter('ALL');
            setActiveWorkspace('progress');
          }}
        />
      )}

      {activeWorkspace === 'catalog' && !viewingCourse && (
      <section className="rounded-2xl border border-[#E2E5E7] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[#E8EAEC] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 ref={catalogHeadingRef} tabIndex={-1} className="text-lg font-semibold text-[#202326] outline-none">Danh mục khóa học</h3>
            <p className="mt-1 text-xs font-semibold text-[#636A70]">
              Xem người học, gỡ khóa không dùng hoặc khôi phục khi cần.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687178]" />
              <input
                aria-label="Tìm khóa học theo tên hoặc kỹ năng"
                value={courseSearch}
                onChange={event => setCourseSearch(event.target.value)}
                placeholder="Tìm khóa học, kỹ năng..."
                className={`${inputClass} pl-10`}
              />
            </div>
            <select
              aria-label="Lọc loại khóa học"
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

        <div className="flex flex-wrap gap-2 border-b border-[#E8EAEC] py-4" role="group" aria-label="Trạng thái danh mục">
          {([{ value: 'active', label: 'Đang sử dụng', count: availableCourses.length }, { value: 'archived', label: 'Đã gỡ', count: archivedCourseCount }] as const).map(scope => (
            <button key={scope.value} type="button" aria-pressed={catalogScope === scope.value} onClick={() => setCatalogScope(scope.value)} className={`min-h-10 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] ${catalogScope === scope.value ? 'bg-[#6F3042] text-white' : 'bg-[#F1F3F3] text-[#596167] hover:bg-[#E8EBEB]'}`}>{scope.label} ({scope.count})</button>
          ))}
        </div>

        {(catalogScope === 'active' ? availableCourses.length : archivedCourseCount) === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D6DADC] bg-[#F8F9F9] px-5 py-10 text-center">
            <BookOpen className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-semibold text-[#53595E]">{catalogScope === 'archived' ? 'Chưa có khóa học đã gỡ' : 'Chưa có khóa học đang sử dụng'}</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#D6DADC] bg-[#F8F9F9] px-5 py-10 text-center">
            <Search className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-semibold text-[#53595E]">
              Không tìm thấy khóa học phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setCourseSearch('');
                setCourseFilter('ALL');
              }}
              className="mt-3 text-xs font-semibold text-[#6F3042] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredCourses.map(course => (
              <article
                key={course.id}
                className="flex min-w-0 flex-col rounded-2xl border border-[#E3E6E7] bg-white p-4 transition-colors hover:border-[#D8CCC2]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${COURSE_TYPE_STYLES[course.type]}`}
                  >
                    {COURSE_TYPE_LABELS[course.type]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#687178]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {course.durationHours} giờ
                  </span>
                </div>

                <h4 className="mt-4 text-[15px] font-semibold leading-6 text-[#202326] [overflow-wrap:anywhere]">
                  {course.title}
                </h4>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {course.skillsProvided.slice(0, 4).map(skill => (
                    <span
                      key={skill}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#716A64] ring-1 ring-inset ring-[#E2E5E6]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-xs text-[#636A70]">Đã gán cho <strong className="font-semibold text-[#4E5652]">{course.assignmentCount} nhân viên</strong></p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E9EA] pt-3">
                  <button type="button" onClick={() => void handleViewLearners(course)} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold text-[#6F3042] hover:bg-[#FAF3F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153]" aria-label={`Xem người học của khóa ${course.title}`}><Users className="h-4 w-4" aria-hidden="true" />Xem người học</button>
                  {course.isArchived ? (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button type="button" disabled={courseMutationId !== null || permanentDeleting} onClick={() => void handleRestoreCourse(course)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[#4E5652] hover:bg-[#F1F3F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] disabled:opacity-50" aria-label={`Khôi phục khóa ${course.title}`}>{courseMutationId === course.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}Khôi phục</button>
                      <button type="button" disabled={courseMutationId !== null || permanentDeleting} onClick={() => { setPermanentDeleteError(''); setPendingPermanentDelete(course); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[#9D4150] hover:bg-[#FBF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] disabled:opacity-50" aria-label={`Xóa vĩnh viễn khóa ${course.title}`}><Trash2 className="h-4 w-4" aria-hidden="true" />Xóa vĩnh viễn</button>
                    </div>
                  ) : (
                    <button type="button" disabled={courseMutationId !== null} onClick={() => { setRemoveError(''); setPendingRemove(course); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold text-[#9D4150] hover:bg-[#FBF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153] disabled:opacity-50" aria-label={`Gỡ khóa ${course.title}`}><Trash2 className="h-4 w-4" aria-hidden="true" />Gỡ</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {activeWorkspace === 'progress' && (
      <section className="overflow-hidden rounded-2xl border border-[#E2E5E7] bg-white">
        {assignmentCourseId !== null && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EAEC] bg-[#FAF3F5] px-5 py-3 text-sm text-[#6F3042] sm:px-7">
            <p>Đang xem khóa: <strong>{courses.find(course => course.id === assignmentCourseId)?.title || 'Khóa học đã chọn'}</strong></p>
            <button type="button" onClick={() => setAssignmentCourseId(null)} className="min-h-10 rounded-lg px-3 font-semibold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4153]">Xem tất cả khóa</button>
          </div>
        )}
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#202326]">Tiến độ đào tạo</h3>
              <p className="mt-1 text-xs font-semibold text-[#687178]">
                Theo dõi hạn hoàn thành, số lần nhắc và trạng thái của từng nhân viên.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687178]" />
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
          <div className="px-5 py-12 text-center text-sm font-semibold text-[#687178]">Chưa có lượt đào tạo nào.</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Search className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-semibold text-[#53595E]">
              Không có lượt đào tạo phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setAssignmentSearch('');
                setAssignmentFilter('ALL');
              }}
              className="mt-3 text-xs font-semibold text-[#6F3042] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="tv4-table-scroll overflow-x-auto" role="region" aria-label="Bảng tiến độ đào tạo" tabIndex={0}>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E8EAEC] bg-[#F8F9F9]">
                  {['Nhân viên', 'Khóa học', 'Loại', 'Hạn hoàn thành', 'Tiến độ', 'Trạng thái'].map(column => (
                    <th
                      key={column}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7"
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
                        <p className="text-sm font-semibold text-[#303438]">{assignment.user.fullName}</p>
                        <p className="mt-0.5 text-xs text-[#687178]">{assignment.user.email}</p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#636A70] sm:px-7">
                        {assignment.course.title}
                        {assignment.course.isDeleted ? <p className="mt-1 text-xs font-normal text-[#80521F]">Khóa đã xóa · Lịch sử được giữ</p> : assignment.course.isArchived && <p className="mt-1 text-xs font-normal text-[#80521F]">Đã gỡ khỏi danh mục</p>}
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${COURSE_TYPE_STYLES[assignment.course.type]}`}>
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
                          <p className="mt-1 text-xs font-bold text-[#936A38]">
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
                            <p className="mt-1 text-xs font-bold text-[#687178]">{progress}%</p>
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
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          assignment.status === 'COMPLETED'
                            ? 'bg-[#EFF7F1] text-[#2F6B4F]'
                            : assignment.status === 'IN_PROGRESS'
                              ? 'bg-[#FBF6ED] text-[#936A38]'
                              : 'bg-[#F1EEEB] text-[#687178]'
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
    aria-pressed={active}
    className={`flex min-h-[76px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
      active
        ? 'border-[#E4CBD3] bg-[#FBF5F7] text-[#6F3042]'
        : 'border-transparent text-[#687178] hover:bg-white hover:text-[#303438]'
    }`}
  >
    <span
      className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${
        active
          ? 'bg-[#F4E7EB] text-[#6F3042]'
          : 'bg-white text-[#687178]'
      }`}
    >
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold leading-5 sm:text-sm">{title}</span>
      <span className="mt-1 hidden text-xs font-normal leading-5 text-[#687178] sm:block">
        {description}
      </span>
    </span>
  </button>
);

const inputClass =
  'h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3.5 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10';

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-[#515C65]">{label}</span>
    {children}
  </label>
);

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, icon }) => (
  <div className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-6 sm:py-5">
    <span className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7] text-[#687178] sm:flex">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-[#515C65]">{label}</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight text-[#1D2023]">{value}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[#687178]">{sub}</p>
    </div>
  </div>
);
