import { apiClient } from './client';
import type { Application } from '../types';

export interface ApplyJobPayload {
  jobId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  cvFileUrl?: string;
  rawCvText?: string;
}

export interface ScheduleInterviewPayload {
  interviewerId: number;
  scheduledAt: string;
  round?: number;
}

export const applicationsApi = {
  apply: async (payload: ApplyJobPayload): Promise<Application> => {
    return apiClient.post('/applications/apply', payload);
  },

  getAll: async (jobId?: number, status?: string): Promise<Application[]> => {
    const params = new URLSearchParams();
    if (jobId) params.append('jobId', String(jobId));
    if (status) params.append('status', status);
    return apiClient.get(`/applications?${params.toString()}`);
  },

  getById: async (id: number): Promise<Application> => {
    return apiClient.get(`/applications/${id}`);
  },

  updateStatus: async (id: number, status: string): Promise<Application> => {
    return apiClient.patch(`/applications/${id}/status`, { status });
  },

  scheduleInterview: async (id: number, payload: ScheduleInterviewPayload): Promise<any> => {
    return apiClient.post(`/applications/${id}/interview`, payload);
  },

  hireCandidate: async (id: number): Promise<any> => {
    return apiClient.post(`/applications/${id}/hire`);
  },
};
