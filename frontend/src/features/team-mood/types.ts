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

export interface TeamMemberOverview {
  userId: number;
  fullName: string;
  jobTitle: string | null;
  hasCheckedIn: boolean;
  mood: TeamMoodType | null;
  feedbackText: string | null;
  isBurnoutRisk: boolean;
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

export interface TeamMoodResponse {
  departmentId?: number;
  departmentName: string;
  departments?: DepartmentItem[];
  managerId: number;
  totalMembers: number;
  checkedInCount: number;
  stats: {
    great: number;
    normal: number;
    stressed: number;
  };
  teamOverview: TeamMemberOverview[];
  burnoutAlerts: TeamBurnoutAlert[];
  todayStressed?: TodayStressedMember[];
}
