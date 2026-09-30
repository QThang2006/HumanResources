export type UserRole = 'SUPERADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId?: number;
  departmentName?: string;
  jobTitle?: string;
}

export interface Job {
  id: number;
  title: string;
  departmentId: number;
  departmentName: string;
  location: string;
  salaryRange: string;
  description: string;
  requirements: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  applicationCount?: number;
}

export interface Application {
  id: number;
  jobId: number;
  jobTitle?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  cvFileUrl: string;
  matchScore?: number;
  skillsDetected?: string[];
  skillsMissing?: string[];
  aiSummary?: string;
  aiRecommendation?: 'STRONG_HIRE' | 'HIRE' | 'CONSIDER' | 'REJECT';
  interviewQuestions?: string[];
  status: 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED';
  createdAt: string;
}

export interface OnboardingTask {
  id: number;
  title: string;
  description?: string;
  category: 'PAPERWORK' | 'EQUIPMENT' | 'TRAINING' | 'MEETING';
  dueDay: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface EmployeeMood {
  id: number;
  userId: number;
  mood: 'GREAT' | 'NORMAL' | 'STRESSED';
  feedbackText?: string;
  sentimentLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  isBurnoutRisk: boolean;
  createdAt: string;
}
