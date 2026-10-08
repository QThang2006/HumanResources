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

export interface TeamMoodResponse {
  departmentName: string;
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
}
