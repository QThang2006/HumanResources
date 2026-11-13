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
  level?: string;
  employmentType?: string;
  experienceYears?: string;
  headcount?: number;
  deadline?: string | null;
  benefits?: string | null;
  skills?: string | null;
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

export type TaskCategory = 'PAPERWORK' | 'EQUIPMENT' | 'TRAINING' | 'MEETING';

export interface OnboardingTask {
  id: number;
  userId: number;
  title: string;
  description?: string;
  category: TaskCategory;
  dueDay: number; // Ngày cần xong (1, 2, 3, 5, 7, 14, 30)
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt?: string;
}

export interface OnboardingTasksResponse {
  userId: number;
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
  tasks: OnboardingTask[];
  message: string;
}

export interface ToggleTaskResponse {
  task: Pick<OnboardingTask, 'id' | 'isCompleted' | 'completedAt'>;
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
  message: string;
}

export interface SeedTasksResponse {
  message: string;
  seeded: boolean;
  count?: number;
}

export interface ChatCopilotResponse {
  userId?: number;
  reply: string;
  sourceDocuments?: string[];
  toolActionExecuted?: unknown;
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