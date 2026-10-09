export type TeamMoodType = 'GREAT' | 'NORMAL' | 'STRESSED';

export interface TeamBurnoutAlert {
  id: number;
  userId: number;
  employeeName: string;
  departmentName?: string;
  mood: TeamMoodType;
  feedbackText: string | null;
  createdAt?: string;
  isBurnoutRisk?: boolean;
  isResolved?: boolean;
}

export interface MemberHistoryDay {
  date: string;
  dayName: string;
  isToday: boolean;
  mood: TeamMoodType | null;
  hasCheckedIn: boolean;
}

export interface TeamMemberOverview {
  userId: number;
  fullName: string;
  jobTitle: string | null;
  hasCheckedIn: boolean;
  mood: TeamMoodType | null;
  feedbackText: string | null;
  isBurnoutRisk: boolean;
  history7Days?: MemberHistoryDay[];
}

export interface DepartmentItem {
  id: number;
  name: string;
  code?: string;
}

export interface TodayStressedMember {
  userId: number;
  employeeName: string;
  jobTitle?: string | null;
  feedbackText?: string | null;
}

export interface DayMoodTrend {
  date: string;
  dayLabel: string;
  dayName: string;
  isToday: boolean;
  stats: {
    great: number;
    normal: number;
    stressed: number;
    total: number;
  };
  dominantMood: TeamMoodType | null;
}

export interface WeeklyMoodSummary {
  totalCheckins: number;
  moraleScore: number;
  moraleStatus: string;
  moraleBadgeColor: string;
  stats: {
    great: number;
    normal: number;
    stressed: number;
  };
  percentages: {
    great: number;
    normal: number;
    stressed: number;
  };
  daysTrend: DayMoodTrend[];
}

export interface TeamMoodResponse {
  departmentId?: number;
  departmentName: string;
  departments?: DepartmentItem[];
  canSwitchDepartment?: boolean;
  managerId: number;
  totalMembers: number;
  checkedInCount: number;
  stats: {
    great: number;
    normal: number;
    stressed: number;
  };
  teamOverview: TeamMemberOverview[];
  weeklySummary?: WeeklyMoodSummary;
  burnoutAlerts: TeamBurnoutAlert[];
  todayStressed?: TodayStressedMember[];
}
