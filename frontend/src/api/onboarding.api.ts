import { apiClient } from './client';
import type { OnboardingTask, EmployeeMood } from '../types';

export interface CheckInMoodPayload {
  mood: 'GREAT' | 'NORMAL' | 'STRESSED';
  feedbackText?: string;
}

export const onboardingApi = {
  getTasks: async (): Promise<{ userId: number; progressPercent: number; tasks: OnboardingTask[] }> => {
    return apiClient.get('/onboarding/tasks');
  },

  toggleTask: async (taskId: number): Promise<any> => {
    return apiClient.patch(`/onboarding/tasks/${taskId}/toggle`);
  },

  checkInMood: async (payload: CheckInMoodPayload): Promise<EmployeeMood> => {
    return apiClient.post('/onboarding/mood', payload);
  },

  getBurnoutAlerts: async (): Promise<any[]> => {
    return apiClient.get('/onboarding/burnout-alerts');
  },

  resolveBurnout: async (moodId: number, note?: string): Promise<any> => {
    return apiClient.patch(`/onboarding/mood/${moodId}/resolve`, { note });
  },

  getTrainings: async (): Promise<any[]> => {
    return apiClient.get('/onboarding/trainings');
  },

  chatWithCopilot: async (message: string): Promise<{ reply: string; sourceDocuments?: string[] }> => {
    return apiClient.post('/onboarding/chat', { message });
  },
};
