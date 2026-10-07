import { apiClient } from './client';

export interface SystemConfig {
  geminiApiKey: string;
  n8nWebhookUrl: string;
}

export interface UpdateSystemConfig {
  geminiApiKey?: string;
  n8nWebhookUrl?: string;
}

export interface N8nTestResult {
  success: boolean;
  message: string;
  source?: string;
}
export interface GeminiTestResult {
  success: boolean;
  message: string;
  model?: string;
}
export const systemConfigApi = {
  get: async (): Promise<SystemConfig> => {
    return apiClient.get('/system-config');
  },

  update: async (data: UpdateSystemConfig): Promise<SystemConfig> => {
    return apiClient.patch('/system-config', data);
  },

  testN8n: async (webhookUrl: string): Promise<N8nTestResult> => {
    return apiClient.post('/system-config/test-n8n', {
      webhookUrl,
    });
  },
  testGemini: async (): Promise<GeminiTestResult> => {
    return apiClient.post('/system-config/test-gemini');
  },
};