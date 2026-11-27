import { apiClient } from './client';

export type OffboardingStatus = 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
export interface OffboardingCase {
  id: number;
  employee: { id: number; fullName?: string; email?: string };
  approvedBy: { id: number; fullName?: string };
  lastWorkingDate: string;
  personalEmail: string | null;
  reason: string | null;
  assetNotes: string | null;
  exitSurveyUrl: string | null;
  status: OffboardingStatus;
  finalizedAt?: string | null;
  managesDepartments?: Array<{ id: number; name: string }>;
  delivery: { itNotified: boolean; financeNotified: boolean; employeeNotified: boolean; telegramNotified: boolean };
  approvedAt: string;
  updatedAt: string;
}
export interface OffboardingInput {
  userId: number;
  lastWorkingDate: string;
  personalEmail?: string;
  reason?: string;
  assetNotes?: string;
  exitSurveyUrl?: string;
}
export const offboardingApi = {
  list: (signal?: AbortSignal): Promise<OffboardingCase[]> => apiClient.get('/offboarding', { signal }),
  approve: (input: OffboardingInput): Promise<{ automationQueued: boolean; message: string; offboarding: OffboardingCase }> => apiClient.post('/offboarding', input),
  cancel: (id: number): Promise<{ message: string; offboarding: OffboardingCase }> => apiClient.patch(`/offboarding/${id}/cancel`),
  finalize: (id: number): Promise<{ message: string; offboarding: OffboardingCase }> => apiClient.patch(`/offboarding/${id}/finalize`),
  retry: (id: number): Promise<{ automationQueued: boolean; message: string }> => apiClient.post(`/offboarding/${id}/retry`),
};
