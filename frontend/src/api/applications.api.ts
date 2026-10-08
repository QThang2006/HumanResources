import { recruitmentApi } from '../features/recruitment/api';

export type ApplyJobPayload = FormData;
export interface ScheduleInterviewPayload { interviewerId: number; scheduledAt: string; round: number }

// Status updates require the current candidate revision; CV intake is multipart.
export const applicationsApi = {
  apply: recruitmentApi.apply,
  getAll: recruitmentApi.candidates,
  getById: recruitmentApi.candidate,
  updateStatus: recruitmentApi.state,
  scheduleInterview: recruitmentApi.schedule,
  hireCandidate: recruitmentApi.hire,
  score: recruitmentApi.score,
  questions: recruitmentApi.questions,
  saveInterviewResult: recruitmentApi.result,
  downloadCv: recruitmentApi.cv,
};
