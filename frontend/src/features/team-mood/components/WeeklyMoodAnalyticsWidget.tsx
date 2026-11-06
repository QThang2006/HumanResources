import React from 'react';
import {
  Activity,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import type { WeeklyMoodSummary, DayMoodTrend } from '../types';

interface WeeklyMoodAnalyticsWidgetProps {
  weeklySummary?: WeeklyMoodSummary;
}

const getMoodEmoji = (mood: string | null) => {
  switch (mood) {
    case 'GREAT':
      return '☀️';
    case 'NORMAL':
      return '⛅';
    case 'STRESSED':
      return '🌧️';
    default:
      return '—';
  }
};

const getDayDominantBadge = (dominantMood: string | null, total: number) => {
  if (total === 0 || !dominantMood) {
    return (
      <span className="text-[11px] font-medium text-slate-400">
        Chưa có
      </span>
    );
  }
  switch (dominantMood) {
    case 'GREAT':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
          ☀️ Hứng khởi
        </span>
      );
    case 'NORMAL':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
          ⛅ Ổn định
        </span>
      );
    case 'STRESSED':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
          🌧️ Căng thẳng
        </span>
      );
    default:
      return null;
  }
};

export const WeeklyMoodAnalyticsWidget: React.FC<WeeklyMoodAnalyticsWidgetProps> = ({
  weeklySummary,
}) => {
  if (!weeklySummary) {
    return null;
  }

  const {
    moraleScore,
    moraleStatus,
    moraleBadgeColor,
    totalCheckins,
    stats,
    percentages,
    daysTrend = [],
  } = weeklySummary;

  // Quyết định màu sắc theo thang điểm Morale Score
  const getMoraleTheme = () => {
    if (moraleBadgeColor === 'rose' || moraleScore < 60) {
      return {
        border: 'border-rose-200',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        scoreColor: 'text-rose-600',
        barBg: 'bg-rose-500',
        tip: 'Khuyến nghị: Quản lý nên chủ động gặp gỡ 1-on-1 để tháo gỡ khối lượng công việc cho các thành sự có dấu hiệu quá tải.',
      };
    }
    if (moraleBadgeColor === 'amber' || moraleScore < 75) {
      return {
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        scoreColor: 'text-amber-600',
        barBg: 'bg-amber-500',
        tip: 'Khuyến nghị: Tinh thần đội ngũ ở mức bình ổn. Tiếp tục theo dõi nhịp công việc và động viên các bạn kịp thời.',
      };
    }
    return {
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      scoreColor: 'text-emerald-600',
      barBg: 'bg-emerald-500',
      tip: 'Tuyệt vời: Năng lượng đội ngũ rất tích cực! Tinh thần gắn kết cao tạo tiền đề bứt phá cho các dự án quan trọng.',
    };
  };

  const theme = getMoraleTheme();

  return (
    <section
      aria-labelledby="weekly-mood-heading"
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs"
    >

      {/* ── TIÊU ĐỀ SECTION ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <CalendarDays className="h-4 w-4" />
            </span>
            <h3 id="weekly-mood-heading" className="text-base font-bold text-slate-900 sm:text-lg">
              Tổng Hợp Nhịp Cảm Xúc Tuần (7 Ngày Gần Nhất)
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
              <Sparkles className="h-3 w-3" />
              Tổng hợp 7 ngày
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Phân tích năng lượng làm việc liên tục trong 7 ngày qua của phòng ban để phát hiện sớm xu hướng tâm lý
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500">
            Tổng lượt check-in tuần:
          </span>
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
            {totalCheckins} lượt
          </span>
        </div>
      </div>

      {/* ── 4 THẺ METRICS TRỌNG TÂM ── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Thẻ 1: Chỉ số năng lượng Morale Score */}
        <div className={`relative overflow-hidden rounded-xl border ${theme.border} bg-white p-4 shadow-2xs`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Chỉ Số Năng Lượng Tuần
            </span>
            <Activity className={`h-4 w-4 ${theme.scoreColor}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-black tracking-tight ${theme.scoreColor}`}>
              {moraleScore}
            </span>
            <span className="text-xs font-medium text-slate-400">/ 100 điểm</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${theme.badge}`}
            >
              {moraleStatus}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${theme.barBg}`}
              style={{ width: `${Math.min(100, Math.max(0, moraleScore))}%` }}
            />
          </div>
        </div>

        {/* Thẻ 2: Tuyệt vời / Hào hứng */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Tuyệt Vời & Hăng Say
            </span>
            <Smile className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{percentages.great}%</span>
            <span className="text-xs font-semibold text-emerald-600">({stats.great} lượt)</span>
          </div>
          <p className="mt-2 text-xs text-emerald-800/80">
            Trạng thái làm việc năng nổ và cảm xúc tích cực
          </p>
        </div>

        {/* Thẻ 3: Bình thường / Ổn định */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Bình Thường & Cân Bằng
            </span>
            <Meh className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{percentages.normal}%</span>
            <span className="text-xs font-semibold text-amber-600">({stats.normal} lượt)</span>
          </div>
          <p className="mt-2 text-xs text-amber-800/80">
            Công việc tiến triển đều đặn, không có trở ngại lớn
          </p>
        </div>

        {/* Thẻ 4: Căng thẳng / Áp lực */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Căng Thẳng & Áp Lực
            </span>
            <Frown className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-700">{percentages.stressed}%</span>
            <span className="text-xs font-semibold text-rose-600">({stats.stressed} lượt)</span>
          </div>
          <p className="mt-2 text-xs text-rose-800/80">
            {stats.stressed > 0
              ? 'Cần quản lý theo dõi và hỗ trợ kịp thời'
              : 'Không có nhân sự nào gặp áp lực nặng'}
          </p>
        </div>
      </div>

      {/* ── DIỄN BIẾN 7 NGÀY (DAY-BY-DAY TREND TRACKER) ── */}
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Diễn Biến Tâm Trạng Từng Ngày (7 Ngày Qua)
            </h4>
            <p className="text-xs text-slate-500">
              Nhịp cảm xúc chủ đạo và tỷ lệ phản hồi của đội ngũ theo từng ngày
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Tuyệt vời
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Bình thường
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Căng thẳng
            </span>
          </div>
        </div>

        {/* 7 Cột tương ứng 7 ngày */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {daysTrend.map((day: DayMoodTrend) => {
            const hasData = day.stats.total > 0;
            const greatShare = hasData ? Math.round((day.stats.great / day.stats.total) * 100) : 0;
            const normalShare = hasData ? Math.round((day.stats.normal / day.stats.total) * 100) : 0;
            const stressedShare = hasData ? Math.round((day.stats.stressed / day.stats.total) * 100) : 0;

            return (
              <div
                key={day.date}
                className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all ${
                  day.isToday
                    ? 'border-blue-400 bg-white shadow-xs ring-2 ring-blue-200/70'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Header ngày */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div>
                    <span
                      className={`text-xs font-bold ${
                        day.isToday ? 'text-blue-600' : 'text-slate-700'
                      }`}
                    >
                      {day.dayLabel}
                    </span>
                    <p className="text-[10px] text-slate-400">{day.date.slice(5)}</p>
                  </div>
                  {day.isToday && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Mood đại diện và số lượng */}
                <div className="my-2 flex flex-col items-center justify-center text-center">
                  <span className="text-xl" title={day.dominantMood || 'Chưa có dữ liệu'}>
                    {getMoodEmoji(day.dominantMood)}
                  </span>
                  <div className="mt-1">
                    {getDayDominantBadge(day.dominantMood, day.stats.total)}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-500 font-medium">
                    {day.stats.total} lượt check-in
                  </span>
                </div>

                {/* Thanh phân bổ tỉ lệ 3 màu */}
                <div className="mt-2">
                  {hasData ? (
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      {greatShare > 0 && (
                        <div
                          className="bg-emerald-500 transition-all"
                          style={{ width: `${greatShare}%` }}
                          title={`Tuyệt vời: ${day.stats.great} (${greatShare}%)`}
                        />
                      )}
                      {normalShare > 0 && (
                        <div
                          className="bg-amber-400 transition-all"
                          style={{ width: `${normalShare}%` }}
                          title={`Bình thường: ${day.stats.normal} (${normalShare}%)`}
                        />
                      )}
                      {stressedShare > 0 && (
                        <div
                          className="bg-rose-500 transition-all"
                          style={{ width: `${stressedShare}%` }}
                          title={`Căng thẳng: ${day.stats.stressed} (${stressedShare}%)`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-2 w-full rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-[8px] text-slate-300">Không có data</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lời khuyên gợi ý từ AI / Quản lý */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 border border-slate-200/60">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
        <span>{theme.tip}</span>
      </div>
    </section>
  );
};
