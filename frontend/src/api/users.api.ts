import { apiClient } from './client';
import type { User, UserRole } from '../types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return apiClient.get('/users');
  },

  updateRole: async (userId: number, role: UserRole): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/users/${userId}/role`, { role });
  },

  seedDemoUsers: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/users/seed');
  },
};
