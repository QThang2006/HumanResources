import React from 'react';
import type { TeamMoodResponse } from '../types';
import { MOOD_META, MOOD_ORDER, toPercent } from '../utils';

type MetricsData = Pick<TeamMoodResponse, 'totalMembers' | 'checkedInCount' | 'stats'>;

const CARD = 'rounded-xl border border-slate-200 bg-white p-5';
const LABEL = 'text-sm font-medium text-slate-500';

const ProgressBar: React.FC<{ percent: number; barClass: string; label: string }> = ({
  percent,
  barClass,
  label,
}) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percent}
    className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
  >
    <div
      className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${barClass}`}
      style={{ width: `${percent}%` }}
    />
  </div>
);

export const TeamMoodMetrics: React.FC<{ data: MetricsData }> = ({ data }) => {
  const { totalMembers, checkedInCount, stats } = data;

  // Card 1 — mẫu số: tổng thành viên
  const checkInPercent = toPercent(checkedInCount, totalMembers);
  const notCheckedIn = Math.max(totalMembers - checkedInCount, 0);

  // Card 2 — mẫu số: SỐ NGƯỜI ĐÃ CHECK-IN (không phải tổng thành viên)
  const positivePercent = toPercent(stats.great, checkedInCount);

  const counts = { GREAT: stats.great, NORMAL: stats.normal, STRESSED: stats.stressed } as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* ── Check-in hôm nay ── */}
      <section className={CARD} aria-labelledby="metric-checkin">
        <h3 id="metric-checkin" className={LABEL}>Check-in hôm nay</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-slate-900">
            {checkedInCount} <span className="text-slate-400">/</span> {totalMembers}
          </span>
          {checkInPercent !== null && (
            <span className="text-sm font-semibold tabular-nums text-slate-500">{checkInPercent}%</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {totalMembers === 0
            ? 'Chưa có thành viên'
            : notCheckedIn > 0
              ? `${notCheckedIn} thành viên chưa check-in`
              : 'Cả đội đã check-in'}
        </p>
        <ProgressBar percent={checkInPercent ?? 0} barClass="bg-indigo-500" label="Tỷ lệ check-in hôm nay" />
      </section>

      {/* ── Năng lượng tích cực ── */}
      <section className={CARD} aria-labelledby="metric-positive">
        <h3 id="metric-positive" className={LABEL}>Năng lượng tích cực</h3>
        {positivePercent === null ? (
          <>
            <div className="mt-2 text-3xl font-bold text-slate-300" aria-label="Chưa có dữ liệu">—</div>
            <p className="mt-1 text-sm text-slate-500">Chưa đủ dữ liệu</p>
            <ProgressBar percent={0} barClass="bg-emerald-500" label="Tỷ lệ năng lượng tích cực" />
          </>
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-slate-900">
                {stats.great} <span className="text-slate-400">/</span> {checkedInCount}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-500">{positivePercent}%</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">người có năng lượng tích cực</p>
            <ProgressBar percent={positivePercent} barClass="bg-emerald-500" label="Tỷ lệ năng lượng tích cực" />
          </>
        )}
      </section>

      {/* ── Phân bố cảm xúc ── */}
      <section className={`${CARD} sm:col-span-2 lg:col-span-1`} aria-labelledby="metric-distribution">
        <h3 id="metric-distribution" className={LABEL}>Phân bố cảm xúc</h3>

        <div
          className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
          aria-hidden="true"
        >
          {checkedInCount > 0 &&
            MOOD_ORDER.map((m) =>
              counts[m] > 0 ? (
                <div
                  key={m}
                  className={`${MOOD_META[m].bar} h-full`}
                  style={{ width: `${(counts[m] / checkedInCount) * 100}%` }}
                />
              ) : null,
            )}
        </div>

        <ul className="mt-4 space-y-2">
          {MOOD_ORDER.map((m) => {
            const meta = MOOD_META[m];
            const Icon = meta.icon;
            return (
              <li key={m} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <Icon className={`h-4 w-4 ${meta.iconColor}`} aria-hidden="true" />
                  {meta.label}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{counts[m]}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};