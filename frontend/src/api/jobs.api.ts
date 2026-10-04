import { apiClient } from './client';
import type { Job } from '../types';

export interface CreateJobPayload {
  title: string;
  departmentId: number;
  location?: string;
  salaryRange?: string;
  description: string;
  requirements: string;
}

export interface GenerateJdPayload {
  title: string;
  departmentName?: string;
  level?: string;
}

export interface UpdateJobPayload extends CreateJobPayload {
  expectedUpdatedAt: string;
}

export interface ChangeJobStatusPayload {
  status: 'OPEN' | 'CLOSED';
  expectedUpdatedAt: string;
}

export interface JobFilters {
  departments: { id: number; name: string }[];
  locations: string[];
}

export interface JobPage {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}

export const jobsApi = {
  getAll: async (all: boolean = false, signal?: AbortSignal, q?: string, departmentId?: number, location?: string): Promise<Job[]> => {
    return apiClient.get<unknown, Job[]>(all ? '/jobs/admin' : '/jobs', { signal, params: { q: q || undefined, departmentId, location: location || undefined } });
  },

  getFilters: async (signal?: AbortSignal): Promise<JobFilters> => {
    return apiClient.get<unknown, JobFilters>('/jobs/filters', { signal });
  },

  getPage: async (signal: AbortSignal, page: number, pageSize: number, q?: string, departmentId?: number, location?: string): Promise<JobPage> => {
    return apiClient.get<unknown, JobPage>('/jobs', {
      signal,
      params: { q: q || undefined, departmentId, location: location || undefined, page, pageSize },
    });
  },

  getById: async (id: number, signal?: AbortSignal): Promise<Job> => {
    return apiClient.get<unknown, Job>(`/jobs/${id}`, { signal });
  },

  create: async (payload: CreateJobPayload): Promise<Job> => {
    return apiClient.post('/jobs', payload);
  },

  update: async (id: number, payload: UpdateJobPayload): Promise<Job> => {
    return apiClient.patch(`/jobs/${id}`, payload);
  },

  changeStatus: async (id: number, payload: ChangeJobStatusPayload): Promise<Job> => {
    return apiClient.patch(`/jobs/${id}/status`, payload);
  },

  generateJdWithAi: async (payload: GenerateJdPayload): Promise<any> => {
    return apiClient.post('/jobs/ai-generate', payload);
  },
};
