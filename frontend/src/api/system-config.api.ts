import { apiClient } from './client';

export interface SystemConfig {
  geminiApiKey: string;
  n8nWebhookUrl: string;
}

export interface UpdateSystemConfig {
  geminiApiKey?: string;
  n8nWebhookUrl?: string;
}

export const systemConfigApi = {
  get: async (): Promise<SystemConfig> => {
    return apiClient.get('/system-config');
  },

  update: async (data: UpdateSystemConfig): Promise<SystemConfig> => {
    return apiClient.patch('/system-config', data);
  },
};