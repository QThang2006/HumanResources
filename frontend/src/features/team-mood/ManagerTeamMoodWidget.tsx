import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { onboardingApi } from '../../api/onboarding.api';
import type { TeamBurnoutAlert, TeamMoodResponse } from './types';
import { getErrorMessage, normalizeTeamMood } from './utils';
import { TeamMoodHeader } from './components/TeamMoodHeader';
import { TeamMoodMetrics } from './components/TeamMoodMetrics';
import { AttentionQueue } from './components/AttentionQueue';
import { TeamOverviewTable } from './components/TeamOverviewTable';
import { InterventionModal } from './components/InterventionModal';
import { WeeklyMoodAnalyticsWidget } from './components/WeeklyMoodAnalyticsWidget';
import { TeamMoodSkeleton, TeamMoodEmptyState, TeamMoodErrorState } from './components/TeamMoodStates';

type LoadMode = 'initial' | 'refresh' | 'silent';
type Status = 'loading' | 'ready' | 'error';

interface ActiveIntervention {
  alert: TeamBurnoutAlert;
  trigger: HTMLElement;
}

const TOAST_DURATION_MS = 5000;

/**
 * Góc nhìn Manager — Team Mood & can thiệp 1-on-1.
 * Luồng: getTeamMood → hiển thị → mở 1-on-1 → resolveBurnout → gỡ cảnh báo khỏi danh sách.
 * State giữ cục bộ; không thêm field nào ngoài payload backend.
 */
export const ManagerTeamMoodWidget: React.FC = () => {
  const [data, setData] = useState<TeamMoodResponse | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [intervention, setIntervention] = useState<ActiveIntervention | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);

  const latestRequestId = useRef(0);
  const refreshingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (mode: LoadMode, deptId?: number) => {
    if (mode === 'refresh') {
      if (refreshingRef.current) return; // chặn bấm làm mới trùng
      refreshingRef.current = true;
      setIsRefreshing(true);
      setRefreshFailed(false);
    }
    if (mode === 'initial') {
      setStatus('loading');
      setErrorDetail(null);
    }

    const requestId = ++latestRequestId.current;
    try {
      const activeDeptId = deptId !== undefined ? deptId : selectedDeptId;
      const raw = (await onboardingApi.getTeamMood(activeDeptId)) as Partial<TeamMoodResponse>;
      if (!mountedRef.current || requestId !== latestRequestId.current) return; // bỏ response cũ
      const normalized = normalizeTeamMood(raw);
      setData(normalized);
      if (normalized.departmentId && selectedDeptId === undefined) {
        setSelectedDeptId(normalized.departmentId);
      }
      setLastUpdated(new Date());
      setStatus('ready');
      setRefreshFailed(false);
    } catch (err) {
      if (!mountedRef.current || requestId !== latestRequestId.current) return;
      if (mode === 'initial') {
        setErrorDetail(getErrorMessage(err));
        setStatus('error');
      } else if (mode === 'refresh') {
        setRefreshFailed(true); // giữ nguyên dữ liệu đang hiển thị
      }
      // 'silent': lỗi nền không làm phiền người dùng
    } finally {
      if (mode === 'refresh') {
        refreshingRef.current = false;
        if (mountedRef.current) setIsRefreshing(false);
      }
    }
  }, [selectedDeptId]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const handleSelectDepartment = useCallback((deptId: number) => {
    setSelectedDeptId(deptId);
    void load('initial', deptId);
  }, [load]);

  // Toast tự tắt
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const jobTitleByUserId = useMemo(
    () => new Map((data?.teamOverview ?? []).map((m) => [m.userId, m.jobTitle] as const)),
    [data?.teamOverview],
  );
  const attentionUserIds = useMemo(
    () => new Set((data?.burnoutAlerts ?? []).map((a) => a.userId)),
    [data?.burnoutAlerts],
  );

  const handleOpenIntervention = useCallback((alert: TeamBurnoutAlert, trigger: HTMLElement) => {
    setIntervention({ alert, trigger });
  }, []);
  const handleCloseIntervention = useCallback(() => setIntervention(null), []);
  const handleRefresh = useCallback(() => void load('refresh'), [load]);
  const handleRetry = useCallback(() => void load('initial'), [load]);

  const handleResolve = useCallback(
    async (note: string | undefined) => {
      if (!intervention) return;
      const { alert } = intervention;

      // Ném lỗi lên modal để hiển thị ngay tại chỗ; modal giữ nguyên nội dung đã nhập.
      await onboardingApi.resolveBurnout(alert.id, note);
      if (!mountedRef.current) return;

      // Gỡ cảnh báo ngay, đóng modal, báo thành công
      setData((prev) =>
        prev ? { ...prev, burnoutAlerts: prev.burnoutAlerts.filter((a) => a.id !== alert.id) } : prev,
      );
      setIntervention(null);
      setToast({ id: Date.now(), message: `Đã ghi nhận can thiệp cho ${alert.employeeName}` });

      // Đồng bộ nền với backend (không chặn UI), rồi trả focus về vùng cảnh báo
      void load('silent');
      window.setTimeout(() => document.getElementById('attention-queue-heading')?.focus(), 0);
    },
    [intervention, load],
  );

  const showHeaderData = status === 'ready' && data;
  const isTeamEmpty = !!data && data.teamOverview.length === 0 && data.burnoutAlerts.length === 0;

  return (
    <div className="space-y-8">
      <TeamMoodHeader
        departmentName={data?.departmentName}
        departmentId={data?.departmentId ?? selectedDeptId}
        departments={data?.departments}
        canSwitchDepartment={data?.canSwitchDepartment}
        onSelectDepartment={handleSelectDepartment}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        isLoading={status === 'loading'}
        onRefresh={handleRefresh}
      />

      {status === 'loading' && <TeamMoodSkeleton />}

      {status === 'error' && (
        <TeamMoodErrorState detail={errorDetail} isRetrying={false} onRetry={handleRetry} />
      )}

      {showHeaderData && (
        <>
          {refreshFailed && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Không thể làm mới Team Mood. Đang hiển thị dữ liệu của lần cập nhật gần nhất.</span>
            </div>
          )}

          {isTeamEmpty ? (
            <TeamMoodEmptyState />
          ) : (
            <>
              <TeamMoodMetrics data={data} />
              {data.weeklySummary && (
                <WeeklyMoodAnalyticsWidget weeklySummary={data.weeklySummary} />
              )}
              <AttentionQueue
                alerts={data.burnoutAlerts}
                todayStressed={data.todayStressed}
                jobTitleByUserId={jobTitleByUserId}
                onOpenIntervention={handleOpenIntervention}
              />
              {data.teamOverview.length > 0 && (
                <TeamOverviewTable members={data.teamOverview} attentionUserIds={attentionUserIds} />
              )}
            </>
          )}
        </>
      )}

      {intervention && (
        <InterventionModal
          key={intervention.alert.id}
          alert={intervention.alert}
          jobTitle={jobTitleByUserId.get(intervention.alert.userId)}
          returnFocusTo={intervention.trigger}
          onSubmit={handleResolve}
          onClose={handleCloseIntervention}
        />
      )}

      {/* Vùng thông báo (luôn có trong DOM để screen reader đọc được) */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerTeamMoodWidget;