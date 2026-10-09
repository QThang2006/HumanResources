import React, { createContext, useContext, useState } from 'react';
import type { User, UserRole } from '../types';
import { authApi } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => Promise<void>;
  setAuthSession: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  SUPERADMIN: { email: 'superadmin@company.com', pass: 'admin123' },
  HR: { email: 'hr@company.com', pass: 'admin123' },
  MANAGER: { email: 'manager@company.com', pass: 'admin123' },
  EMPLOYEE: { email: 'employee@company.com', pass: 'admin123' },
};

const mockUsers: Record<UserRole, User> = {
  SUPERADMIN: {
    id: 1,
    fullName: 'Nguyễn Văn Quản Trị',
    email: 'superadmin@company.com',
    role: 'SUPERADMIN',
    jobTitle: 'Hệ Thống Trưởng',
  },
  HR: {
    id: 2,
    fullName: 'Lê Thị Thu Thảo',
    email: 'hr@company.com',
    role: 'HR',
    departmentName: 'Nhân Sự & Đào Tạo',
    jobTitle: 'Trưởng Nhóm Tuyển Dụng',
  },
  MANAGER: {
    id: 3,
    fullName: 'Trần Văn Minh',
    email: 'manager@company.com',
    role: 'MANAGER',
    departmentId: 1,
    departmentName: 'Kỹ Thuật & AI',
    jobTitle: 'Trưởng Phòng Kỹ Thuật',
  },
  EMPLOYEE: {
    id: 4,
    fullName: 'Phạm Hồng Quân',
    email: 'employee@company.com',
    role: 'EMPLOYEE',
    departmentId: 1,
    departmentName: 'Kỹ Thuật & AI',
    jobTitle: 'Kỹ Sư Phần Mềm Mới',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('hr_current_user');
      const token = localStorage.getItem('hr_access_token');
      if (saved && token) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore parse error
    }
    return null;
  });

  const setAuthSession = (newUser: User, token: string) => {
    localStorage.setItem('hr_access_token', token);
    localStorage.setItem('hr_current_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const login = async (role: UserRole) => {
    const cred = DEMO_CREDENTIALS[role];
    if (cred) {
      try {
        const res = await authApi.login({ email: cred.email, password: cred.pass });
        setAuthSession(res.user, res.accessToken);
        return;
      } catch (err) {
        console.warn('Cannot switch role via authApi.login, fallback to mock user:', err);
      }
    }
    const selected = mockUsers[role];
    if (selected) {
      setUser(selected);
      localStorage.setItem('hr_current_user', JSON.stringify(selected));
    }
  };

  const logout = () => {
    localStorage.removeItem('hr_current_user');
    localStorage.removeItem('hr_access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        setAuthSession,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
