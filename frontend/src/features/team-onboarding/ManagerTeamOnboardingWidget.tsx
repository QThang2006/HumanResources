import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Building2,
  RotateCcw,
  Search,
  Check,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ListTodo,
} from 'lucide-react';
import { onboardingApi } from '../../api/onboarding.api';
import type {
  TeamOnboardingResponse,
  TeamOnboardingTaskItem,
} from '../../api/onboarding.api';

interface ManagerTeamOnboardingWidgetProps {
  initialDeptId?: number;
}

const CATEGORY_TAG_COLORS: Record<string, string> = {
  ADMINISTRATIVE: 'bg-blue-50 text-blue-700 border-blue-200',
  PAPERWORK: 'bg-blue-50 text-blue-700 border-blue-200',
  EQUIPMENT: 'bg-sky-50 text-sky-700 border-sky-200',
  TRAINING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEETING: 'bg-amber-50 text-amber-700 border-amber-200',
  GOAL_SETTING: 'bg-rose-50 text-rose-700 border-rose-200',
};

const CATEGORY_NAMES: Record<string, string> = {
  ADMINISTRATIVE: 'Hành chính',
  PAPERWORK: 'Hành chính',
  EQUIPMENT: 'Thiết bị',
  TRAINING: 'Đào tạo',
  MEETING: 'Gặp gỡ',
  GOAL_SETTING: 'Mục tiêu',
};

export const ManagerTeamOnboardingWidget: React.FC<ManagerTeamOnboardingWidgetProps> = ({
  initialDeptId,
}) => {
  const [data, setData] = useState<TeamOnboardingResponse | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(initialDeptId);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [expandedUserIds, setExpandedUserIds] = useState<Set<number>>(new Set());
  const [togglingTaskId, setTogglingTaskId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async (deptId?: number, isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await onboardingApi.getTeamOnboarding(deptId);
      setData(res);
      if (res.departmentId && !deptId) {
        setSelectedDeptId(res.departmentId);
      }
      // Tự động mở rộng xem 10 task cho tất cả nhân viên để Quản lý thấy ngay lập tức
      if (res.employees && res.employees.length > 0) {
        setExpandedUserIds(new Set(res.employees.map((e) => e.userId)));
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải tiến độ onboarding của đội ngũ.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDeptId);
  }, [selectedDeptId, loadData]);

  const handleSelectDepartment = (deptId: number) => {
    setSelectedDeptId(deptId);
  };

  const handleRefresh = () => {
    loadData(selectedDeptId, true);
  };

  const toggleExpand = (userId: number) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Toggle task của một nhân viên và cập nhật tiến trình ngay lập tức
  const handleToggleTask = async (employeeId: number, task: TeamOnboardingTaskItem) => {
    if (togglingTaskId !== null) return;
    setTogglingTaskId(task.id);

    // Optimistic Update trên UI
    const targetState = !task.isCompleted;

    setData((prev) => {
      if (!prev) return prev;
      const updatedEmployees = prev.employees.map((emp) => {
        if (emp.userId !== employeeId) return emp;

        const updatedTasks = emp.tasks.map((t) =>
          t.id === task.id
            ? { ...t, isCompleted: targetState, completedAt: targetState ? new Date().toISOString() : null }
            : t,
        );
        const completedCount = updatedTasks.filter((t) => t.isCompleted).length;
        const total = updatedTasks.length;
        const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        return {
          ...emp,
          tasks: updatedTasks,
          completedTasks: completedCount,
          progressPercent: progress,
        };
      });

      const totalEmps = updatedEmployees.length;
      const completedAll = updatedEmployees.filter((e) => e.progressPercent === 100).length;
      const avg =
        totalEmps > 0
          ? Math.round(updatedEmployees.reduce((acc, cur) => acc + cur.progressPercent, 0) / totalEmps)
          : 0;

      return {
        ...prev,
        summary: {
          totalEmployees: totalEmps,
          completedAllCount: completedAll,
          inProgressCount: totalEmps - completedAll,
          averageProgress: avg,
        },
        employees: updatedEmployees,
      };
    });

    try {
      const res = await onboardingApi.toggleTask(task.id);
      showToast(
        res.task.isCompleted
          ? `✅ Đã tick hoàn thành: "${task.title}" (Tiến độ: ${res.progressPercent}%)`
          : `↩️ Đã bỏ tick: "${task.title}" (Tiến độ: ${res.progressPercent}%)`,
      );
    } catch {
      showToast('❌ Có lỗi khi cập nhật nhiệm vụ. Đang tải lại dữ liệu...');
      await loadData(selectedDeptId, true);
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Lọc danh sách nhân viên theo từ khóa tìm kiếm và trạng thái
  const filteredEmployees = (data?.employees || []).filter((emp) => {
    const matchSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.jobTitle && emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;
    if (statusFilter === 'COMPLETED') return emp.progressPercent === 100;
    if (statusFilter === 'IN_PROGRESS') return emp.progressPercent < 100;
    return true;
  });

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 sm:p-7 shadow-sm transition-all duration-300">
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. HEADER & BỘ LỌC PHÒNG BAN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ListTodo className="w-6 h-6 text-blue-600" />
              Tiến Độ Thử Việc Đội Ngũ (30 Ngày)
            </h2>
            {data?.departments && data.departments.length > 0 && (
              data.canSwitchDepartment !== false && data.departments.length > 1 ? (
                <div className="relative inline-flex items-center">
                  <label htmlFor="team-onboarding-dept-select" className="sr-only">
                    Lọc theo phòng ban
                  </label>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 focus-within:ring-2 focus-within:ring-blue-500">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <select
                      id="team-onboarding-dept-select"
                      value={selectedDeptId ?? data.departmentId ?? ''}
                      onChange={(e) => handleSelectDepartment(Number(e.target.value))}
                      disabled={isRefreshing || loading}
                      className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
                    >
                      {data.departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-800 shadow-xs">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>{data.departmentName || (data.departments && data.departments[0]?.name) || 'Đội ngũ trực thuộc'}</span>
                  <span className="ml-1 rounded bg-blue-200/60 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Đội ngũ của bạn</span>
                </div>
              )
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Giám sát lộ trình hoàn thành nhiệm vụ thử việc của từng nhân sự trong phòng ban
          </p>
        </div>

        {/* Nút Làm mới */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ── 2. METRICS TỔNG QUAN PHÒNG BAN ── */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng nhân sự thử việc</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{data.summary.totalEmployees}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Phòng {data.departmentName}</p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Đã hoàn thành 100%</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">{data.summary.completedAllCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Vượt qua thử việc</p>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Đang thực hiện</p>
            <p className="text-2xl font-black text-blue-800 mt-1">{data.summary.inProgressCount}</p>
            <p className="text-[11px] text-blue-600 mt-0.5">Cần theo sát tiến độ</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Tiến độ trung bình</p>
              <span className="text-xs font-black text-slate-800">{data.summary.averageProgress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${data.summary.averageProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-blue-600" /> Toàn phòng ban
            </p>
          </div>
        </div>
      )}

      {/* ── 3. SEARCH & TABS LỌC TRẠNG THÁI ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, chức danh hoặc email nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đang thử việc
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              statusFilter === 'COMPLETED'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đã xong 100%
          </button>
        </div>
      </div>

      {/* ── 4. LOADING & ERROR STATES ── */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* ── 5. DANH SÁCH NHÂN VIÊN & CHECKLIST CHI TIẾT ── */}
      {!loading && !error && filteredEmployees.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white/40">
          <UserCheck className="w-9 h-9 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Không tìm thấy nhân viên nào</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {searchTerm ? 'Không khớp với từ khóa tìm kiếm.' : 'Chưa có nhân viên nào trong phòng ban này.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredEmployees.length > 0 && (
        <div className="space-y-3">
          {filteredEmployees.map((emp) => {
            const isExpanded = expandedUserIds.has(emp.userId);
            const isCompletedAll = emp.progressPercent === 100;

            return (
              <div
                key={emp.userId}
                className="bg-white border border-slate-200 rounded-xl shadow-xs transition hover:border-slate-300 overflow-hidden"
              >
                {/* Header thẻ nhân viên */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Thông tin nhân viên */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                        {emp.fullName
                          .split(' ')
                          .pop()
                          ?.charAt(0)
                          .toUpperCase() || 'U'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{emp.fullName}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCompletedAll
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isCompletedAll ? 'Hoàn tất 100%' : 'Đang thử việc'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{emp.jobTitle}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{emp.email}</span>
                      </p>
                    </div>
                  </div>

                  {/* Thanh tiến độ & Nút mở rộng */}
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="w-48 sm:w-56">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {emp.completedTasks}/{emp.totalTasks} nhiệm vụ
                        </span>
                        <span className="font-bold text-slate-900 tabular-nums">{emp.progressPercent}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompletedAll ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${emp.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(emp.userId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition"
                    >
                      <span>{isExpanded ? 'Thu gọn' : 'Xem 10 task'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Danh sách 10 nhiệm vụ khi mở rộng */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-blue-600" />
                        Danh sách nhiệm vụ thử việc của {emp.fullName}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        Quản lý có thể tick trực tiếp để cập nhật tiến độ
                      </span>
                    </div>

                    <div className="space-y-2">
                      {emp.tasks.map((task) => {
                        const isToggling = togglingTaskId === task.id;
                        const categoryColor = CATEGORY_TAG_COLORS[task.category] || 'bg-slate-100 text-slate-600';
                        const categoryName = CATEGORY_NAMES[task.category] || task.category;

                        return (
                          <div
                            key={task.id}
                            className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition ${
                              task.isCompleted
                                ? 'bg-emerald-50/40 border-emerald-200/60'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox có thể tick trực tiếp */}
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleTask(emp.userId, task)}
                                aria-label={`Đánh dấu ${task.title}`}
                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                                  task.isCompleted
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 bg-white hover:border-blue-500'
                                } ${isToggling ? 'opacity-50 animate-pulse' : ''}`}
                              >
                                {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`text-xs font-bold ${
                                      task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${categoryColor}`}
                                  >
                                    {categoryName}
                                  </span>
                                </div>
                                {task.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end shrink-0 text-right">
                              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Ngày {task.dueDay}
                              </span>
                              {task.isCompleted && (
                                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Đã hoàn tất
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
