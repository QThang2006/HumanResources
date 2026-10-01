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

export const jobsApi = {
  getAll: async (all: boolean = false): Promise<Job[]> => {
    return apiClient.get(all ? '/jobs/admin' : '/jobs');
  },

  getById: async (id: number): Promise<Job> => {
    return apiClient.get(`/jobs/${id}`);
  },

  create: async (payload: CreateJobPayload): Promise<Job> => {
    return apiClient.post('/jobs', payload);
  },

  generateJdWithAi: async (payload: GenerateJdPayload): Promise<any> => {
    return apiClient.post('/jobs/ai-generate', payload);
  },
};
