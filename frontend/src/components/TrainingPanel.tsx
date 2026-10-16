import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';

import {
  trainingApi,
  type TrainingAssignment,
  type TrainingCourse,
  type TrainingCourseType,
  type TrainingSummary,
} from '../api/training.api';
import { usersApi } from '../api/users.api';
import type { User } from '../types';

const COURSE_TYPE_LABELS: Record<TrainingCourseType, string> = {
  MANDATORY: 'BẮT BUỘC',
  AI_SKILL_GAP: 'AI CHỈ ĐỊNH',
  SOFT_SKILL: 'KỸ NĂNG MỀM',
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
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [courseType, setCourseType] =
    useState<TrainingCourseType>('MANDATORY');
  const [skills, setSkills] = useState('');
  const [courseUrl, setCourseUrl] = useState('');
  const [durationHours, setDurationHours] = useState('10');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignedByAi, setAssignedByAi] = useState(false);
  const [aiReason, setAiReason] = useState('');

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

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
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(true);
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

      setSelectedCourseId(String(suggestion.courseId));
      setAssignedByAi(true);
      setAiReason(suggestion.reason);

      setMessage(
          `AI đề xuất khóa "${suggestion.courseTitle}" cho nhân viên. Vui lòng kiểm tra trước khi gán.`,
      );
    } catch (error) {
      console.error(error);

      setAssignedByAi(false);
      setAiReason('');

      setMessage(
          error instanceof Error
              ? error.message
              : 'AI chưa thể đề xuất khóa học.',
      );
    } finally {
      setAiSuggesting(false);
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
      });

      setSelectedUserId('');
      setSelectedCourseId('');
      setAssignedByAi(false);
      setAiReason('');
      setMessage('Đã gán khóa học cho nhân viên.');
      await loadData();
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

  const isSuccessMessage =
    message.startsWith('Đã ') || message.toLowerCase().includes('thành công');

  const courseStats = useMemo(() => {
    return {
      mandatory: courses.filter(course => course.type === 'MANDATORY').length,
      ai: courses.filter(course => course.type === 'AI_SKILL_GAP').length,
      soft: courses.filter(course => course.type === 'SOFT_SKILL').length,
    };
  }, [courses]);

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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#1D2023]">
                Đào tạo & Phát triển
              </h2>
            </div>

            <button
              type="button"
              onClick={() => loadData(false)}
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
            sub={`${summary.inProgress} đang học`}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="Hoàn thành"
            value={summary.completed}
            sub={`${summary.completionRate}% hoàn thành`}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <MetricCard
            label="Tiến độ TB"
            value={`${summary.averageProgress}%`}
            sub={`${courseStats.ai} khóa AI CHỈ ĐỊNH`}
            icon={<GraduationCap className="h-4 w-4" />}
          />
        </div>
      </section>

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
                <option value="AI_SKILL_GAP">AI CHỈ ĐỊNH (KỸ NĂNG)</option>
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
              <FormField label="URL khóa học">
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
                onChange={event => setSelectedUserId(event.target.value)}
                className={inputClass}
              >
                <option value="">Chọn nhân viên</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} - {user.email}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Khóa học">
              <select
                value={selectedCourseId}
                onChange={event => setSelectedCourseId(event.target.value)}
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
          </div>

          <button
              type="button"
              onClick={handleAiSuggestCourse}
              disabled={!selectedUserId || aiSuggesting}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E6D7BF] bg-[#FBF6ED] px-4 text-sm font-black text-[#936A38] transition hover:bg-[#F5EAD8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiSuggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <BrainCircuit className="h-4 w-4" />
            )}

            {aiSuggesting
                ? 'AI đang phân tích...'
                : 'AI Phân tích & Gợi ý Khóa học'}
          </button>

          {assignedByAi && (
            <textarea
              value={aiReason}
              onChange={event => setAiReason(event.target.value)}
              placeholder="Lý do AI đề xuất khóa học..."
              className="mt-3 min-h-24 w-full resize-y rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] px-4 py-3 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
            />
          )}

          <button
            type="button"
            onClick={handleAssignCourse}
            disabled={assigning}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#202326] px-5 text-sm font-black text-white transition hover:bg-[#171412] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {assigning ? 'Đang gán...' : 'Gán khóa học'}
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E2E5E7] bg-white p-5 shadow-[0_12px_34px_rgba(45,34,28,0.055)] sm:p-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#202326]">Danh mục khóa học</h3>
          </div>
          <span className="text-xs font-bold text-[#82898E]">{courses.length} khóa học</span>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#D6DADC] bg-[#F8F9F9] px-5 py-10 text-center">
            <BookOpen className="mx-auto h-5 w-5 text-[#9FA6AB]" />
            <p className="mt-2 text-sm font-black text-[#53595E]">Chưa có khóa học</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {courses.map(course => (
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

      <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7">
          <h3 className="text-lg font-black text-[#202326]">Tiến độ đào tạo</h3>
        </div>

        {assignments.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm font-semibold text-[#82898E]">Chưa có lượt đào tạo nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E8EAEC] bg-[#F8F9F9]">
                  {['Nhân viên', 'Khóa học', 'Loại', 'Tiến độ', 'Trạng thái'].map(column => (
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
                {assignments.map(assignment => {
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
    </div>
  );
};

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
