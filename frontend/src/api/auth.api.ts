import { apiClient } from './client';
import type { User, UserRole } from '../types';

export interface LoginPayload {
  email: string;
  password?: string;
  role?: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', payload);
  },

  getProfile: async (): Promise<User> => {
    return apiClient.get('/auth/profile');
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/auth/logout');
  },
};
