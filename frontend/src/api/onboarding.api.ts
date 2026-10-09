import { apiClient } from './client';
import type {
  EmployeeMood,
  OnboardingTasksResponse,
  ToggleTaskResponse,
  SeedTasksResponse,
  ChatCopilotResponse,
} from '../types';

export interface CheckInMoodPayload {
  mood: 'GREAT' | 'NORMAL' | 'STRESSED';
  feedbackText?: string;
}

export const onboardingApi = {
  getTasks: async (): Promise<OnboardingTasksResponse> => {
    return apiClient.get('/onboarding/tasks');
  },

  getTodayMood: async (): Promise<EmployeeMood | null> => {
    return apiClient.get('/onboarding/mood/today');
  },

  getMoodHistory: async (): Promise<EmployeeMood[]> => {
    return apiClient.get('/onboarding/mood/history');
  },

  toggleTask: async (taskId: number): Promise<ToggleTaskResponse> => {
    return apiClient.patch(`/onboarding/tasks/${taskId}/toggle`);
  },

  seedTasks: async (): Promise<SeedTasksResponse> => {
    return apiClient.post('/onboarding/seed-tasks');
  },

  checkInMood: async (payload: CheckInMoodPayload): Promise<EmployeeMood> => {
    return apiClient.post('/onboarding/mood', payload);
  },

  getBurnoutAlerts: async (): Promise<any[]> => {
    return apiClient.get('/onboarding/burnout-alerts');
  },

  getTeamMood: async (): Promise<any> => {
    return apiClient.get('/onboarding/team-mood');
  },

  resolveBurnout: async (moodId: number, note?: string): Promise<any> => {
    return apiClient.patch(`/onboarding/mood/${moodId}/resolve`, { note });
  },

  getTrainings: async (): Promise<any[]> => {
    return apiClient.get('/onboarding/trainings');
  },
updateTrainingProgress: async (
  assignmentId: number,
  progressPercent: number,
): Promise<any> => {
  return apiClient.patch(
    `/onboarding/trainings/${assignmentId}/progress`,
    { progressPercent },
  );
},

  chatWithCopilot: async (message: string): Promise<ChatCopilotResponse> => {
    return apiClient.post('/onboarding/chat', { message });
  },
};