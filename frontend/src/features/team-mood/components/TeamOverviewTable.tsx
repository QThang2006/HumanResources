import React from 'react';
import type { TeamMemberOverview } from '../types';
import { MoodBadge } from './MoodBadge';

interface TeamOverviewTableProps {
  members: TeamMemberOverview[];
  /** userId đang có cảnh báo chưa xử lý (từ burnoutAlerts) */
  attentionUserIds: Set<number>;
}

const CheckInStatus: React.FC<{ checkedIn: boolean }> = ({ checkedIn }) =>
  checkedIn ? (
    <span className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      Đã check-in
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span className="h-2 w-2 rounded-full border-2 border-slate-300" aria-hidden="true" />
      Chưa check-in
    </span>
  );

const MoodCell: React.FC<{ member: TeamMemberOverview; needsAttention: boolean }> = ({
  member,
  needsAttention,
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {member.hasCheckedIn && member.mood ? (
      <MoodBadge mood={member.mood} />
    ) : (
      <span className="text-sm text-slate-400" aria-label="Chưa có tâm trạng">—</span>
    )}
    {needsAttention && (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-1.5 py-0.5 text-xs font-medium text-rose-700">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
        Cần quan tâm
      </span>
    )}
  </div>
);

const Feedback: React.FC<{ text: string | null }> = ({ text }) =>
  text?.trim() ? (
    <p className="whitespace-pre-line break-words text-sm text-slate-700">{text}</p>
  ) : (
    <p className="text-sm italic text-slate-400">Chưa có chia sẻ</p>
  );

export const TeamOverviewTable: React.FC<TeamOverviewTableProps> = ({ members, attentionUserIds }) => (
  <section aria-labelledby="team-overview-heading">
    <div className="mb-3 flex items-baseline gap-2">
      <h3 id="team-overview-heading" className="text-base font-semibold text-slate-900">
        Tổng quan đội ngũ
      </h3>
      <span className="text-sm text-slate-500">{members.length} thành viên</span>
    </div>

    {/* Desktop / tablet: bảng */}
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
      <table className="w-full text-left">
        <caption className="sr-only">Check-in và tâm trạng của từng thành viên hôm nay</caption>
        <thead className="border-b border-slate-200 bg-slate-50/70">
          <tr className="text-xs font-medium uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-4 py-3 font-medium">Nhân sự</th>
            <th scope="col" className="px-4 py-3 font-medium">Check-in</th>
            <th scope="col" className="px-4 py-3 font-medium">Tâm trạng</th>
            <th scope="col" className="px-4 py-3 font-medium">Chia sẻ trong ngày</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => (
            <tr key={m.userId} className="align-top transition-colors duration-150 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-slate-900">{m.fullName}</div>
                {m.jobTitle && <div className="text-xs text-slate-500">{m.jobTitle}</div>}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <CheckInStatus checkedIn={m.hasCheckedIn} />
              </td>
              <td className="px-4 py-3">
                <MoodCell member={m} needsAttention={attentionUserIds.has(m.userId)} />
              </td>
              <td className="max-w-md px-4 py-3">
                <Feedback text={m.feedbackText} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile: danh sách thẻ */}
    <ul className="space-y-2 md:hidden">
      {members.map((m) => (
        <li key={m.userId} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">{m.fullName}</div>
              {m.jobTitle && <div className="text-xs text-slate-500">{m.jobTitle}</div>}
            </div>
            <div className="shrink-0">
              <CheckInStatus checkedIn={m.hasCheckedIn} />
            </div>
          </div>
          <div className="mt-3">
            <MoodCell member={m} needsAttention={attentionUserIds.has(m.userId)} />
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <Feedback text={m.feedbackText} />
          </div>
        </li>
      ))}
    </ul>
  </section>
);