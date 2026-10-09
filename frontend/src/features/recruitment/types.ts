export type JobStatus = 'OPEN' | 'CLOSED';
export type ApplicationStatus = 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED';
export type InterviewResult = 'PENDING' | 'PASSED' | 'FAILED';
export interface Lookup {
  id: number;
  name: string;
}
export interface DepartmentLookup extends Lookup {
  code: string;
  managerId: number | null;
}
export interface DepartmentManager {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'SUPERADMIN';
  departmentId?: number | null;
  departmentName?: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
}
export interface JobInput {
  title: string;
  departmentId: number;
  location: string;
  salaryRange: string;
  description: string;
  requirements: string;
}
export interface Interview {
  id: number;
  applicationId: number;
  interviewerId: number;
  interviewerName: string;
  round: number;
  scheduledAt: string;
  meetingLink: string | null;
  questions: string[];
  score: number | null;
  feedback: string | null;
  result: InterviewResult;
  updatedAt: string;
  automation?: {
    status: 'UNVERIFIED' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
    calendarStatus: string;
    emailStatus: string;
    failureStage: string | null;
    updatedAt: string | null;
  };
}
export interface Candidate {
  id: number;
  jobId: number;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  status: ApplicationStatus;
  matchScore: number | null;
  aiSummary: string | null;
  aiRecommendation: string | null;
  skillsDetected: string[];
  hiredUserId: number | null;
  hasCv: boolean;
  hasCvText: boolean;
  interviews: Interview[];
  createdAt: string;
  updatedAt: string;
}
export interface CandidatePage extends Page<Candidate> {
  counts: Partial<Record<ApplicationStatus, number>>;
}
export interface ScheduledInterview {
  id: number;
  applicationId: number;
  candidateName: string;
  candidateEmail: string;
  applicationStatus: ApplicationStatus;
  jobId: number;
  jobTitle: string;
  departmentId: number;
  departmentName: string;
  interviewerId: number;
  interviewerName: string;
  round: number;
  scheduledAt: string;
  meetingLink: string | null;
  result: InterviewResult;
  score: number | null;
  updatedAt: string;
}
export interface InterviewScheduleQuery {
  from: string;
  to: string;
  jobId?: number;
  interviewerId?: number;
  result?: InterviewResult;
  q?: string;
  page?: number;
  pageSize?: number;
}
export interface Capabilities {
  jd: boolean;
  score: boolean;
  questions: boolean;
  hire: boolean;
  notice: string;
}
export interface HireReceipt {
  success: boolean;
  hiredUserId: number;
  alreadyHired: boolean;
  onboardingTasksCount: number;
  welcomeEmailStatus: 'DISPATCHED_UNVERIFIED' | 'FAILED' | 'NOT_RETRIED';
  email: string;
  fullName: string;
}
export interface AiResult<T> {
  mode: 'LIVE' | 'MOCK';
  data: T;
  saved?: boolean;
}
export const statusLabels: Record<ApplicationStatus, string> = {
  APPLIED: 'Mới nộp',
  INTERVIEWING: 'Đang phỏng vấn',
  OFFERED: 'Đề xuất nhận việc',
  HIRED: 'Đã nhận việc',
  REJECTED: 'Đã từ chối',
};
