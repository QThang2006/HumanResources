import { apiClient } from '../../api/client';
import type { AiResult, ApplicationStatus, Candidate, CandidatePage, Capabilities, Interview, InterviewResult, Job, JobInput, Lookup, Page } from './types';

// The shared client unwraps JSON responses; Axios' default return type does not reflect it.
const get = <T>(url: string, params?: object, signal?: AbortSignal) => apiClient.get<unknown, T>(url, { params, signal });
const post = <T>(url: string, data?: unknown) => apiClient.post<unknown, T>(url, data, { timeout: 55000 });
const patch = <T>(url: string, data: unknown) => apiClient.patch<unknown, T>(url, data);
export const recruitmentApi = {
  jobs: (params: { page?: number; pageSize?: number; q?: string; status?: string; departmentId?: number; location?: string }, internal = false, signal?: AbortSignal) => get<Page<Job>>(internal ? '/jobs/admin' : '/jobs', { page: 1, pageSize: 20, ...params }, signal),
  job: (id: number, signal?: AbortSignal) => get<Job>('/jobs/' + id, undefined, signal),
  filters: () => get<{ departments: Lookup[]; locations: string[] }>('/jobs/filters'),
  departments: () => get<Lookup[]>('/jobs/departments'),
  capabilities: () => get<Capabilities>('/jobs/capabilities'),
  createJob: (input: JobInput) => post<Job>('/jobs', input),
  updateJob: (job: Job, input: JobInput) => patch<Job>('/jobs/' + job.id, { ...input, expectedUpdatedAt: job.updatedAt }),
  jobStatus: (job: Job) => patch<Job>('/jobs/' + job.id + '/status', { status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN', expectedUpdatedAt: job.updatedAt }),
  jd: (title: string, departmentName: string, level: string) => post<AiResult<{ description: string; requirements: string; benefits: string }>>('/jobs/ai-generate', { title, departmentName, level }),
  apply: (data: FormData, signal?: AbortSignal) => apiClient.post<unknown, { applicationId: number; message: string; warning: string | null }>('/applications/apply', data, { headers: { 'Content-Type': undefined }, timeout: 25000, signal }),
  candidates: (params: object, signal?: AbortSignal) => get<CandidatePage>('/applications', params, signal),
  candidate: (id: number) => get<Candidate>('/applications/' + id),
  state: (candidate: Candidate, status: ApplicationStatus) => patch<Candidate>('/applications/' + candidate.id + '/status', { expectedStatus: candidate.status, status }),
  score: (id: number) => post<AiResult<{ matchScore: number; summary: string; skillsDetected: string[] }>>('/applications/' + id + '/score'),
  interviewers: (jobId: number) => get<{ id: number; fullName: string }[]>('/applications/interviewers', { jobId }),
  schedule: (id: number, input: { interviewerId: number; scheduledAt: string; round: number }) => post<{ interview: Interview; dispatch: string; message: string }>('/applications/' + id + '/interview', input),
  questions: (id: number) => post<AiResult<string[]>>('/applications/interviews/' + id + '/questions'),
  result: (interview: Interview, input: { score: number; feedback: string; result: InterviewResult }) => patch<Candidate>('/applications/interviews/' + interview.id + '/result', { ...input, expectedResult: interview.result, expectedUpdatedAt: interview.updatedAt }),
  hire: (id: number) => post<{ hiredUserId: number; alreadyHired: boolean }>('/applications/' + id + '/hire'),
  cv: (id: number) => apiClient.get<unknown, Blob>('/applications/' + id + '/cv', { responseType: 'blob' }),
};
