import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
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
  type TrainingCourseUpdate,
  type TrainingCourseType,
  type TrainingStatus,
  type TrainingSummary,
} from '../api/training.api';
import { TrainingCourseCatalog } from './TrainingCourseCatalog';
import { trainingDateInput as dateInputValue, trainingDayKey } from './training-date';
import { usersApi } from '../api/users.api';
import { useAuth } from '../context/AuthContext';
import { ReviewCalendarPanel } from './ReviewCalendarPanel';
import { OffboardingPanel } from './OffboardingPanel';
import type { User } from '../types';
import { CourseRemoveDialog } from './CourseRemoveDialog';
import { CoursePermanentDeleteDialog } from './CoursePermanentDeleteDialog';
import { CourseEditDialog } from './CourseEditDialog';
import { TrainingToast } from './TrainingToast';
import '../styles/tv4-ui.css';
import './training-progress.css';

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
  MANDATORY: 'border-amber-200 bg-amber-50 text-amber-800',
  AI_SKILL_GAP: 'border-primary-200 bg-primary-50 text-primary-700',
  SOFT_SKILL: 'border-slate-200 bg-slate-50 text-slate-700',
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Đã giao',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Hoàn thành',
};

type TrainingWorkspace = 'setup' | 'catalog' | 'progress' | 'reviews' | 'offboarding';
type AssignmentFilter = 'ALL' | TrainingStatus;

export const TrainingPanel: React.FC<{ presentation?: 'standard' | 'admin' }> = ({ presentation = 'standard' }) => {
  const { user: currentUser } = useAuth();
  const canViewReviews = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'HR' || currentUser?.role === 'MANAGER';
  const canViewOffboarding = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'HR';
  const [offboardingOpened, setOffboardingOpened] = useState(false);
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
  const [loadError, setLoadError] = useState(false);
  const [dueDrafts, setDueDrafts] = useState<Record<number, string>>({});
  const [dueErrors, setDueErrors] = useState<Record<number, string>>({});
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
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const noticeSequence = useRef(0);
  const message = notice?.message ?? '';
  const setMessage = useCallback((text: string) => {
    setNotice(text ? { id: ++noticeSequence.current, message: text } : null);
  }, []);
  const noticeId = notice?.id;
  const dismissNotice = useCallback(() => {
    setNotice(current => current?.id === noticeId ? null : current);
  }, [noticeId]);
  const [activeWorkspace, setActiveWorkspace] =
    useState<TrainingWorkspace>('progress');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [catalogScope, setCatalogScope] = useState<'active' | 'archived'>('active');
  const [pendingRemove, setPendingRemove] = useState<TrainingCourse | null>(null);
  const [courseMutationId, setCourseMutationId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<TrainingCourse | null>(null);
  const [permanentDeleteError, setPermanentDeleteError] = useState('');
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<TrainingCourse | null>(null);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editError, setEditError] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [trackedCourseId, setTrackedCourseId] = useState<number | null>(null);
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>('ALL');
  const [referenceTime, setReferenceTime] = useState(Date.now);

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

  const selectedEmployee = users.find(user => String(user.id) === selectedUserId);
  const employees = useMemo(
    () => users.filter(user => user.role === 'EMPLOYEE'),
    [users],
  );
  const availableCourses = useMemo(() => courses.filter(course => !course.isArchived), [courses]);
  const archivedCourseCount = courses.length - availableCourses.length;

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
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
      setReferenceTime(Date.now());
    } catch (error) {
      console.error(error);
      setLoadError(true);
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

  useEffect(() => () => {
    analysisRequest.current?.abort();
    readinessRequest.current?.abort();
  }, []);

  useEffect(() => {
    if (aiSuggestion) {
      analysisResultRef.current?.focus();
    }
  }, [aiSuggestion]);

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
      window.requestAnimationFrame(() => document.getElementById('tv4-catalog-heading')?.focus());
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
      window.requestAnimationFrame(() => document.getElementById('tv4-catalog-heading')?.focus());
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

  const handleEditCourse = async (data: TrainingCourseUpdate) => {
    if (!pendingEdit || editingCourse) return;
    setEditingCourse(true);
    setEditError('');
    try {
      const saved = await trainingApi.updateCourse(pendingEdit.id, data);
      setCourses(current => current.map(course => course.id === saved.id ? saved : course));
      setAssignments(current => current.map(assignment => assignment.course.id === saved.id && !assignment.course.isDeleted
        ? { ...assignment, course: { ...assignment.course, ...saved } } : assignment));
      if (aiSuggestion?.courseId === saved.id) {
        setAiSuggestion(null);
        setAssignedByAi(false);
        setAiReason('');
      }
      setPendingEdit(null);
      setMessage('Đã cập nhật thông tin khóa học. Tiến độ và lịch sử người học được giữ nguyên.');
      window.requestAnimationFrame(() => document.getElementById('tv4-catalog-heading')?.focus());
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Không thể cập nhật khóa học. Vui lòng thử lại.');
      // Refresh counts for the next opening if another administrator assigned
      // or archived this course while the form was open. Keep the current draft.
      try { setCourses(await trainingApi.getCourses(true)); } catch { /* Keep the original save error. */ }
    } finally {
      setEditingCourse(false);
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
      setShowCreateCourse(false);
      await loadData();
      setCatalogScope('active');
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
    if (assignedByAi) setSelectedCourseId('');
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
      setMessage(`Đã cập nhật tiến độ học tập: ${progressPercent}%.`);
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
    if (!dueAt || dueAt < dateInputValue(1)) {
      setDueErrors(current => ({ ...current, [assignmentId]: 'Vui lòng chọn ngày từ ngày mai trở đi.' }));
      return;
    }
    try {
      setUpdatingDueId(assignmentId);
      setMessage('');
      setDueErrors(current => ({ ...current, [assignmentId]: '' }));
      await trainingApi.updateDueDate(assignmentId, dueAt);
      setMessage(`Đã cập nhật hạn hoàn thành: ${dueAt.split('-').reverse().join('/')}.`);
      setDueDrafts(current => { const next = { ...current }; delete next[assignmentId]; return next; });
      await loadData();
    } catch (error) {
      console.error(error);
      setDueErrors(current => ({ ...current, [assignmentId]: error instanceof Error ? error.message : 'Không thể lưu hạn. Vui lòng thử lại.' }));
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

      return matchesStatus && matchesKeyword && (trackedCourseId === null || assignment.course.id === trackedCourseId);
    }).filter(assignment => !attentionOnly || (
      assignment.status !== 'COMPLETED' && assignment.progressPercent < 50 &&
      assignment.dueAt && new Date(assignment.dueAt).getTime() <= referenceTime + 3 * 86400000
    )).sort((a, b) => {
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return -1;
      return (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) -
        (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);
    });
  }, [assignmentFilter, assignmentSearch, assignments, attentionOnly, referenceTime, trackedCourseId]);

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
        dueTime - referenceTime <= threeDays
      );
    }).length;
  }, [assignments, referenceTime]);

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-semibold">Đang tải dữ liệu đào tạo...</span>
      </div>
    );
  }

  if (loadError) {
    return <section className="tv4-load-error" role="alert">
      <Info className="h-6 w-6" />
      <h2>Không thể tải dữ liệu đào tạo</h2>
      <p>Kết nối đến hệ thống đang gặp sự cố. Vui lòng thử lại để xem thông tin mới nhất.</p>
      <button type="button" onClick={() => void loadData()} className="tv4-primary"><RefreshCw className="h-4 w-4" /> Thử lại</button>
    </section>;
  }

  return (
    <div className={`tv4-training space-y-5 ${presentation === 'admin' ? 'tv4-training-admin' : ''}`}>
      {pendingEdit && <CourseEditDialog key={pendingEdit.id} course={pendingEdit} busy={editingCourse} error={editError}
        onCancel={() => { if (!editingCourse) { setPendingEdit(null); setEditError(''); } }}
        onConfirm={data => void handleEditCourse(data)} />}
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
      {notice && <TrainingToast key={notice.id} message={message} success={isSuccessMessage} onClose={dismissNotice} />}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Đào tạo & Phát triển
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
              Thiết kế khóa học, phân tích năng lực và theo dõi tiến độ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setActiveWorkspace('setup')} className="tv4-primary">
              <UserPlus className="h-4 w-4" /> Gán khóa học
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </button>
            </div>
          </div>
        </div>

        {presentation === 'admin' ? (
          <div className="tv4-learning-overview">
            <div className="tv4-learning-progress">
              <div className="tv4-learning-progress-heading">
                <h3>{summary.totalAssignments ? 'Hành trình học tập của đội ngũ' : 'Bắt đầu hành trình phát triển'}</h3>
                {summary.totalAssignments > 0 && <span>{summary.completionRate}% hoàn thành</span>}
              </div>
              {summary.totalAssignments > 0 ? (
                <>
                  <p className="tv4-learning-total"><strong>{summary.completed}</strong><span>trên {summary.totalAssignments} lượt đào tạo đã hoàn thành</span></p>
                  <div className="tv4-learning-track" role="img" aria-label={`${summary.completed} hoàn thành, ${summary.inProgress} đang học, ${summary.assigned} đã giao`}>
                    <span className="is-completed" style={{ flex: summary.completed }} />
                    <span className="is-learning" style={{ flex: summary.inProgress }} />
                    <span className="is-assigned" style={{ flex: summary.assigned }} />
                  </div>
                  <ul className="tv4-learning-legend">
                    <li><span className="is-completed" />{summary.completed} hoàn thành</li>
                    <li><span className="is-learning" />{summary.inProgress} đang học</li>
                    <li><span className="is-assigned" />{summary.assigned} chưa bắt đầu</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="tv4-learning-empty">Gán khóa học đầu tiên để theo dõi tiến độ và phát triển năng lực cho nhân viên.</p>
                  <button type="button" className="tv4-learning-start" onClick={() => setActiveWorkspace('setup')}>Gán khóa học đầu tiên <ArrowRight className="h-4 w-4" /></button>
                </>
              )}
              <div className="tv4-learning-catalog">
                <BookOpen className="h-4 w-4" />
                <button type="button" onClick={() => setActiveWorkspace('catalog')}>{courses.length ? `${availableCourses.length} khóa trong danh mục` : 'Chưa có khóa học'}</button>
                <span>·</span><span>{courseStats.mandatory} khóa bắt buộc</span>
                {summary.totalAssignments > 0 && <><span>·</span><span>Tiến độ trung bình {summary.averageProgress}%</span></>}
              </div>
            </div>
            <button type="button" className={`tv4-learning-attention ${dueSoonCount ? 'has-attention' : ''}`} onClick={() => { setActiveWorkspace('progress'); setTrackedCourseId(null); setAssignmentSearch(''); setAssignmentFilter('ALL'); setAttentionOnly(dueSoonCount > 0); }}>
              <span className="tv4-learning-attention-title"><CalendarDays className="h-5 w-5" /> Theo dõi thời hạn <ArrowRight className="h-4 w-4" /></span>
              {dueSoonCount > 0 ? <><strong>{dueSoonCount}<small> lượt cần chú ý</small></strong><p>Khóa bắt buộc quá hạn hoặc còn tối đa 3 ngày, tiến độ dưới 50%.</p><span className="tv4-learning-attention-action">Xem danh sách cần xử lý <ArrowRight className="h-4 w-4" /></span></> : <><CheckCircle2 className="tv4-learning-all-clear" /><strong className="tv4-learning-clear-title">{summary.totalAssignments ? 'Chưa có lượt cần nhắc' : 'Sẵn sàng theo dõi'}</strong><p>{summary.totalAssignments ? 'Các lượt đào tạo hiện chưa có cảnh báo thời hạn.' : 'Các khóa sắp đến hạn sẽ xuất hiện tại đây sau khi được phân công.'}</p></>}
            </button>
          </div>
        ) : (
        <div className="tv4-training-metrics grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
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
            sub="Quá hạn hoặc sắp đến hạn, dưới 50%"
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-1.5">
        <div className={`grid gap-1.5 ${canViewReviews ? 'grid-cols-2 xl:grid-cols-5' : 'grid-cols-3'}`}>
          <WorkspaceTab
            active={activeWorkspace === 'setup'}
            icon={<Sparkles className="h-4 w-4" />}
            title="Gán khóa & Phân tích AI"
            description="Chọn nhân viên và lộ trình học"
            onClick={() => setActiveWorkspace('setup')}
          />
          <WorkspaceTab
            active={activeWorkspace === 'catalog'}
            icon={<LayoutGrid className="h-4 w-4" />}
            title="Danh mục khóa học"
            description={`${availableCourses.length} đang sử dụng · ${archivedCourseCount} đã gỡ`}
            onClick={() => setActiveWorkspace('catalog')}
          />
          <WorkspaceTab
            active={activeWorkspace === 'progress'}
            icon={<ListChecks className="h-4 w-4" />}
            title="Theo dõi tiến độ"
            description={`${summary.inProgress} đang học · ${dueSoonCount} cần chú ý`}
            onClick={() => { setTrackedCourseId(null); setActiveWorkspace('progress'); }}
          />
          {canViewReviews && <WorkspaceTab
            active={activeWorkspace === 'reviews'}
            icon={<CalendarDays className="h-4 w-4" />}
            title="Đánh giá định kỳ"
            description="Lịch nhắc và tình trạng đánh giá"
            onClick={() => setActiveWorkspace('reviews')}
          />}
          {canViewOffboarding && <WorkspaceTab
            active={activeWorkspace === 'offboarding'}
            icon={<Users className="h-4 w-4" />}
            title="Hồ sơ thôi việc"
            description="Điều phối và kết quả thông báo"
            onClick={() => { setOffboardingOpened(true); setActiveWorkspace('offboarding'); }}
          />}
        </div>
      </section>

      {activeWorkspace === 'reviews' && canViewReviews && <ReviewCalendarPanel />}
      {offboardingOpened && canViewOffboarding && <div hidden={activeWorkspace !== 'offboarding'}><OffboardingPanel active={activeWorkspace === 'offboarding'} /></div>}

      {(activeWorkspace === 'setup' || (activeWorkspace === 'catalog' && showCreateCourse)) && (
      <section className="tv4-training-setup">
        {activeWorkspace === 'catalog' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Tạo khóa học</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="Tên khóa học">
              <input
                id="tv4-new-course-title"
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
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
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
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingCourse ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tạo khóa học
          </button>
        </div>
        )}
        {activeWorkspace === 'setup' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-primary-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Gán khóa học</h3>
              <p className="mt-1 text-sm text-slate-600">Chọn nhân viên, xem đề xuất và duyệt khóa học phù hợp.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="Nhân viên">
              <select
                id="tv4-assignment-employee"
                aria-label="Nhân viên nhận khóa học"
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
              <p className="mt-1.5 text-xs font-semibold text-slate-600">
                Hệ thống tự động nhắc khi khóa bắt buộc còn tối đa 3 ngày và tiến độ dưới 50%.
              </p>
            </div>
          </div>

          {selectedEmployee && (
            <div className="tv4-selected-employee">
              <Users className="h-4 w-4" />
              <div><strong>{selectedEmployee.fullName}</strong><p>{selectedEmployee.jobTitle || 'Chưa cập nhật chức danh'} · {selectedEmployee.email}</p></div>
            </div>
          )}

          {checkingReadiness && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang kiểm tra dữ liệu nhân viên...
            </div>
          )}

          {aiReadiness && !aiReadiness.canAnalyze && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
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
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
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

          {aiSuggesting && <p role="status" className="mt-3 text-sm leading-6 text-slate-600">Đang phân tích hồ sơ và đối chiếu danh mục khóa học. Vui lòng chờ kết quả.</p>}
          {aiError && <p id="training-ai-error" role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{aiError}</p>}

          {aiSuggestion && (
            <div ref={analysisResultRef} tabIndex={-1} role="region" aria-label={`Kết quả phân tích năng lực: ${aiSuggestion.employeeName}`} className="mt-4 overflow-hidden rounded-xl border border-primary-200 bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-200 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary-600">
                  <BrainCircuit className="h-4 w-4" />
                  {aiSuggestion.analysisMode === 'PRELIMINARY'
                    ? 'Kết quả phân tích sơ bộ'
                    : 'Kết quả phân tích khoảng trống năng lực'}
                </div>
                <span className="rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                  {aiSuggestion.analysisMode === 'PRELIMINARY'
                    ? 'Điểm tham khảo'
                    : 'Mức sẵn sàng'}{' '}
                  {aiSuggestion.readinessScore}/100
                </span>
              </div>

              <div className="space-y-4 p-4 text-sm">
                {aiSuggestion.analysisMode === 'PRELIMINARY' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                    {aiSuggestion.dataNotice ||
                      'Phân tích sơ bộ — chưa có dữ liệu KPI. Kết quả chỉ mang tính gợi ý phát triển.'}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {aiSuggestion.analysisMode === 'PRELIMINARY'
                      ? 'Kỹ năng nên phát triển'
                      : 'Khoảng trống kỹ năng'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {aiSuggestion.skillGaps.map(skill => (
                      <span key={skill} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <details className="tv4-ai-details">
                  <summary>Nhận định và định hướng phát triển</summary>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {aiSuggestion.analysisMode === 'PRELIMINARY'
                      ? 'Nhận định sơ bộ'
                      : 'Đánh giá tổng quan'}
                  </p>
                  <p className="mt-1 leading-6 text-slate-700">{aiSuggestion.summary}</p>
                </div>
                <p className="mt-3 leading-6 text-slate-700">{aiSuggestion.careerAdvice}</p>
                </details>

                <div className="rounded-xl border border-amber-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {aiSuggestion.hasMatchingCourse ? 'Khóa học đề xuất' : 'Trạng thái kho khóa học'}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {aiSuggestion.courseTitle ?? 'Chưa có khóa học phù hợp'}
                      </p>
                    </div>
                    {aiSuggestion.priority && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        {PRIORITY_LABELS[aiSuggestion.priority]}
                      </span>
                    )}
                  </div>
                  {aiSuggestion.estimatedTimeToComplete && (
                    <p className="mt-2 text-xs font-semibold text-slate-600">Thời gian: {aiSuggestion.estimatedTimeToComplete}</p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-slate-700">{aiSuggestion.reason}</p>
                </div>

              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAssignCourse}
            disabled={assigning || aiSuggesting || checkingReadiness || !selectedUserId || !selectedCourseId}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        )}
      </section>
      )}

      {activeWorkspace === 'catalog' && (
        <TrainingCourseCatalog
          courses={courses}
          catalogScope={catalogScope}
          onScopeChange={setCatalogScope}
          mutationBusy={courseMutationId !== null || permanentDeleting || editingCourse}
          onEdit={course => { setEditError(''); setPendingEdit(course); }}
          onRemove={course => { setRemoveError(''); setPendingRemove(course); }}
          onRestore={course => void handleRestoreCourse(course)}
          onPermanentDelete={course => { setPermanentDeleteError(''); setPendingPermanentDelete(course); }}
          onTrack={course => {
            setTrackedCourseId(course.id);
            setAssignmentSearch('');
            setAssignmentFilter('ALL');
            setAttentionOnly(false);
            setActiveWorkspace('progress');
            window.requestAnimationFrame(() => document.getElementById('tv4-training-progress-title')?.focus());
          }}
          showCreateCourse={showCreateCourse}
          onToggleCreate={() => {
            setShowCreateCourse(value => !value);
            if (!showCreateCourse) window.requestAnimationFrame(() => document.getElementById('tv4-new-course-title')?.focus());
          }}
          onAssign={course => {
            handleCourseChange(String(course.id));
            setActiveWorkspace('setup');
            setMessage('');
            window.requestAnimationFrame(() => document.getElementById('tv4-assignment-employee')?.focus());
          }}
        />
      )}

      {activeWorkspace === 'progress' && (
      <section className="tv4-progress-panel" aria-labelledby="tv4-training-progress-title">
        <header className="tv4-progress-heading">
          <div>
              <h3 id="tv4-training-progress-title" tabIndex={-1} className="text-lg font-semibold text-slate-900">Tiến độ đào tạo</h3>
              <p>
                Theo dõi hạn hoàn thành, số lần nhắc và trạng thái của từng nhân viên.
              </p>
          </div>
        </header>
        <div className="tv4-progress-toolbar">
              <div className="tv4-progress-search">
                <Search size={18} aria-hidden="true" />
                <input
                  aria-label="Tìm nhân viên hoặc khóa học trong tiến độ"
                  value={assignmentSearch}
                  onChange={event => setAssignmentSearch(event.target.value)}
                  placeholder="Tìm nhân viên, khóa học..."
                  className="tv4-progress-search-input"
                />
              </div>
              <div className="tv4-progress-status-filter">
              <select
                aria-label="Lọc trạng thái học tập"
                value={assignmentFilter}
                onChange={event =>
                  setAssignmentFilter(event.target.value as AssignmentFilter)
                }
                className="tv4-progress-filter-input"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ASSIGNED">Đã giao</option>
                <option value="IN_PROGRESS">Đang học</option>
                <option value="COMPLETED">Hoàn thành</option>
              </select>
              </div>
              <button type="button" onClick={() => setAttentionOnly(value => !value)} aria-pressed={attentionOnly} className={`tv4-filter tv4-progress-attention ${attentionOnly ? 'is-active' : ''}`}>
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> Cần chú ý ({dueSoonCount})
              </button>
        </div>

        {trackedCourseId !== null && <div className="tv4-tracked-course" role="status">
          <BookOpen size={17} aria-hidden="true" />
          <span>Đang theo dõi: <strong>{courses.find(course => course.id === trackedCourseId)?.title ?? 'Khóa học đã chọn'}</strong></span>
          <button type="button" onClick={() => setTrackedCourseId(null)}>Xem tất cả khóa học</button>
        </div>}
        {assignments.length === 0 ? (
          <div className="tv4-progress-empty">Chưa có lượt đào tạo nào.</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="tv4-progress-empty">
            <Search className="mx-auto h-5 w-5 text-slate-500" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Không có lượt đào tạo phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setAssignmentSearch('');
                setAssignmentFilter('ALL');
                setTrackedCourseId(null);
                setAttentionOnly(false);
              }}
              className="mt-3 text-xs font-semibold text-primary-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="tv4-table-scroll tv4-progress-table-wrap" role="region" aria-label="Bảng tiến độ đào tạo" tabIndex={0}>
            <table className="tv4-progress-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Nhân viên', 'Khóa học', 'Loại', 'Hạn hoàn thành', 'Tiến độ', 'Trạng thái'].map(column => (
                    <th
                      key={column}
                      scope="col"
                      className="tv4-progress-column"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredAssignments.map(assignment => {
                  const progress = Math.max(0, Math.min(100, assignment.progressPercent));
                  const overdue = assignment.status !== 'COMPLETED' && assignment.dueAt && new Date(assignment.dueAt).getTime() < referenceTime;
                  const savedDueDate = assignment.dueAt ? trainingDayKey(assignment.dueAt) : '';
                  const hasDueDraft = dueDrafts[assignment.id] !== undefined && dueDrafts[assignment.id] !== savedDueDate;

                  return (
                    <tr key={assignment.id} className={overdue ? 'tv4-overdue-row' : 'tv4-progress-row'}>
                      <td className="tv4-progress-person">
                        <div className="tv4-progress-person-identity">
                        <span className="tv4-progress-person-icon"><Users size={18} aria-hidden="true" /></span>
                        <div>
                        <p className="text-sm font-semibold text-slate-900">{assignment.user.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{assignment.user.email}</p>
                        </div>
                        </div>
                      </td>

                      <td className="tv4-progress-course">
                        <div className="tv4-progress-course-identity"><BookOpen size={17} aria-hidden="true" /><div>
                        {assignment.course.title}
                        {assignment.course.isDeleted ? <p className="mt-1 text-xs font-normal text-amber-800">Khóa đã xóa · Lịch sử được giữ</p> : assignment.course.isArchived && <p className="mt-1 text-xs font-normal text-amber-800">Đã gỡ khỏi danh mục</p>}
                        </div></div>
                      </td>

                      <td className="tv4-progress-type" data-label="Loại khóa học">
                        <span className={`tv4-progress-type-badge rounded-full border px-2.5 py-1 text-xs font-semibold ${COURSE_TYPE_STYLES[assignment.course.type]}`}>
                          {COURSE_TYPE_LABELS[assignment.course.type]}
                        </span>
                      </td>

                      <td className="tv4-progress-deadline" data-label="Hạn hoàn thành">
                        <div className="tv4-progress-date-control">
                          <input
                            type="date"
                            aria-label={`Hạn hoàn thành khóa ${assignment.course.title} của ${assignment.user.fullName}`}
                            min={dateInputValue(1)}
                            value={dueDrafts[assignment.id] ?? savedDueDate}
                            aria-invalid={Boolean(dueErrors[assignment.id])}
                            aria-describedby={dueErrors[assignment.id] ? `due-error-${assignment.id}` : undefined}
                            disabled={updatingDueId === assignment.id}
                            onChange={event => {
                              setDueDrafts(current => ({ ...current, [assignment.id]: event.target.value }));
                              setDueErrors(current => ({ ...current, [assignment.id]: '' }));
                            }}
                            className="tv4-progress-date-input"
                          />
                          {updatingDueId === assignment.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                        </div>
                        {hasDueDraft && <div className="tv4-due-actions">
                          <button type="button" disabled={updatingDueId !== null} onClick={() => void handleDueDateChange(assignment.id, dueDrafts[assignment.id])} aria-label={`Lưu hạn của ${assignment.user.fullName} cho khóa ${assignment.course.title}`}>Lưu</button>
                          <button type="button" disabled={updatingDueId === assignment.id} onClick={() => {
                            setDueDrafts(current => { const next = { ...current }; delete next[assignment.id]; return next; });
                            setDueErrors(current => ({ ...current, [assignment.id]: '' }));
                          }}>Hủy</button>
                        </div>}
                        {dueErrors[assignment.id] && <p id={`due-error-${assignment.id}`} role="alert" className="tv4-overdue-label">{dueErrors[assignment.id]}</p>}
                        {overdue && <p className="tv4-overdue-label">Đã quá hạn</p>}
                        {assignment.reminderCount > 0 && (
                          <p className="tv4-progress-reminder">
                            Đã nhắc {assignment.reminderCount} lần
                          </p>
                        )}
                      </td>

                      <td className="tv4-progress-value" data-label="Tiến độ học tập">
                        <div className="tv4-progress-controls">
                          <div className="tv4-progress-meter">
                            <div className="tv4-progress-track">
                              <div
                                className="h-full rounded-full bg-primary-600 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="tv4-progress-percent">{progress}%</p>
                          </div>

                          {updatingId === assignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                          ) : (
                            <select
                              aria-label={`Tiến độ khóa ${assignment.course.title} của ${assignment.user.fullName}`}
                              value={assignment.progressPercent}
                              onChange={event =>
                                handleProgressChange(
                                  assignment.id,
                                  Number(event.target.value),
                                )
                              }
                              className="tv4-progress-select"
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

                      <td className="tv4-progress-state">
                        <span className={`tv4-progress-state-badge inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          assignment.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : assignment.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
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
    aria-pressed={active}
    onClick={onClick}
    className={`flex min-h-[76px] items-center gap-3 rounded-lg border px-3 py-3 text-left transition sm:px-4 ${
      active
        ? 'border-primary-200 bg-primary-50 text-primary-600'
        : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
    }`}
  >
    <span
      className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${
        active
          ? 'bg-primary-50 text-primary-600'
          : 'bg-white text-slate-600'
      }`}
    >
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold leading-5 sm:text-sm">{title}</span>
      <span className="mt-1 hidden text-xs font-normal leading-5 text-slate-600 sm:block">
        {description}
      </span>
    </span>
  </button>
);

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10';

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
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
    <span className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:flex">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">{sub}</p>
    </div>
  </div>
);
