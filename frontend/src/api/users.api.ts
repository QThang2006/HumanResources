import { apiClient } from './client';
import type { User, UserRole } from '../types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return apiClient.get('/users');
  },
    getDepartments: async (): Promise<
        Array<{
            id: number;
            name: string;
            code?: string;
            description?: string;
        }>
    > => {
        return apiClient.get('/users/departments');
    },
    createDepartment: async (data: {
        name: string;
        code: string;
        description?: string;
    }): Promise<{
        success: boolean;
        message: string;
        department: {
            id: number;
            name: string;
            code: string;
            description?: string;
        };
    }> => {
        return apiClient.post('/users/departments', data);
    },
    createUser: async (data: {
        fullName: string;
        email: string;
        password: string;
        phone?: string;
        jobTitle?: string;
        departmentId?: number;
        role: UserRole;
    }): Promise<{
        success: boolean;
        message: string;
        user: User;
    }> => {
        return apiClient.post('/users', data);
    },

  updateRole: async (userId: number, role: UserRole): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/users/${userId}/role`, { role });
  },
  updateUser: async (
      userId: number,
      data: {
        departmentId?: number;
        jobTitle?: string;
        role?: UserRole;
        isActive?: boolean;
      },
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/users/${userId}`, data);
  },

  deleteUser: async (
      userId: number,
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/users/${userId}`);
  },

  seedDemoUsers: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/users/seed');
  },
};
