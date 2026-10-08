import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { TeamBurnoutAlert } from '../types';
import { formatDateTime } from '../utils';
import { MoodBadge } from './MoodBadge';

interface AttentionQueueProps {
  alerts: TeamBurnoutAlert[];
  jobTitleByUserId: Map<number, string | null | undefined>;
  onOpenIntervention: (alert: TeamBurnoutAlert, trigger: HTMLElement) => void;
}

export const AttentionQueue: React.FC<AttentionQueueProps> = ({
  alerts,
  jobTitleByUserId,
  onOpenIntervention,
}) => {
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
        {alerts.length > 0 && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
            {alerts.length} trường hợp
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Đội ngũ đang ổn</p>
            <p className="text-xs text-slate-500">Hiện chưa có cảnh báo cần can thiệp.</p>
          </div>
        </div>
      ) : (
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
