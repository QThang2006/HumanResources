import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { TeamBurnoutAlert, TodayStressedMember } from '../types';
import { formatDateTime } from '../utils';
import { MoodBadge } from './MoodBadge';

interface AttentionQueueProps {
  alerts: TeamBurnoutAlert[];
  todayStressed?: TodayStressedMember[];
  jobTitleByUserId: Map<number, string | null | undefined>;
  onOpenIntervention: (alert: TeamBurnoutAlert, trigger: HTMLElement) => void;
}

export const AttentionQueue: React.FC<AttentionQueueProps> = ({
  alerts,
  todayStressed,
  jobTitleByUserId,
  onOpenIntervention,
}) => {
  const hasDailyStressed = todayStressed && todayStressed.length > 0;

  return (
    <section aria-labelledby="attention-queue-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3
            id="attention-queue-heading"
            tabIndex={-1}
            className="text-base font-semibold text-slate-900 focus:outline-none"
          >
            Cần quan tâm
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Những tín hiệu cần manager chủ động theo dõi
          </p>
        </div>
        {(alerts.length > 0 || hasDailyStressed) && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            alerts.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {alerts.length > 0 ? `${alerts.length} nguy cơ kiệt sức` : `${todayStressed!.length} căng thẳng hôm nay`}
          </span>
        )}
      </div>

      {alerts.length === 0 && !hasDailyStressed && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Đội ngũ đang ổn</p>
            <p className="text-xs text-slate-500">Hiện chưa có cảnh báo cần can thiệp.</p>
          </div>
        </div>
      )}

      {alerts.length === 0 && hasDailyStressed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  Tín hiệu căng thẳng trong ngày ({todayStressed!.length} nhân sự)
                </p>
                <p className="text-[11px] text-amber-700">
                  Chưa đạt ngưỡng kiệt sức (3 ngày) nhưng nên chủ động thăm hỏi sớm
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
              Cảnh báo sớm
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 mt-3">
            {todayStressed!.map((ts) => (
              <div key={ts.userId} className="flex flex-col justify-between bg-white/90 rounded-xl p-3 border border-amber-200/60 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{ts.employeeName}</span>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Căng thẳng</span>
                  </div>
                  {ts.jobTitle && <p className="text-[11px] text-slate-400 mt-0.5">{ts.jobTitle}</p>}
                  {ts.feedbackText && (
                    <p className="mt-2 text-xs italic text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      &ldquo;{ts.feedbackText}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {alerts.map((alert) => {
            const jobTitle = jobTitleByUserId.get(alert.userId);
            return (
              <div
                key={alert.id}
                className="flex flex-col justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4 transition-all hover:bg-rose-50 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {alert.employeeName}
                      </h4>
                      {jobTitle && (
                        <p className="text-xs text-slate-500">{jobTitle}</p>
                      )}
                    </div>
                    <MoodBadge mood={alert.mood} />
                  </div>

                  {alert.feedbackText ? (
                    <p className="mt-3 text-xs leading-relaxed text-slate-700 italic bg-white/70 rounded-lg p-2.5 border border-rose-100">
                      &ldquo;{alert.feedbackText}&rdquo;
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400 italic">
                      Chưa để lại lời nhắn cụ thể.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-rose-200/60">
                  <span className="text-[11px] text-slate-400">
                    {alert.createdAt ? formatDateTime(alert.createdAt) : 'Gần đây'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => onOpenIntervention(alert, e.currentTarget)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-colors"
                  >
                    <span>Mở 1-on-1</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
