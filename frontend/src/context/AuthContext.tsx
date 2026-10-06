import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => Promise<void>;
  setAuthSession: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const mockUsers: Record<UserRole, User> = {
  SUPERADMIN: {
    id: 1,
    fullName: 'Hoàng Minh Admin (IT Director)',
    email: 'admin@fpt.edu.vn',
    role: 'SUPERADMIN',
    jobTitle: 'Giám đốc Công nghệ',
  },
  HR: {
    id: 2,
    fullName: 'Nguyễn Thị Thu HR (Talent Lead)',
    email: 'hr@fpt.edu.vn',
    role: 'HR',
    departmentName: 'Phòng Nhân sự',
    jobTitle: 'Trưởng nhóm Tuyển dụng',
  },
  MANAGER: {
    id: 3,
    fullName: 'Trần Văn Minh (Tech Lead)',
    email: 'manager.it@fpt.edu.vn',
    role: 'MANAGER',
    departmentId: 1,
    departmentName: 'Phòng Kỹ thuật Phần mềm (TECH)',
    jobTitle: 'Trưởng phòng Kỹ thuật',
  },
  EMPLOYEE: {
    id: 4,
    fullName: 'Phạm Hồng Quân (New Hire)',
    email: 'quan.pham@fpt.edu.vn',
    role: 'EMPLOYEE',
    departmentId: 1,
    departmentName: 'Phòng Kỹ thuật Phần mềm (TECH)',
    jobTitle: 'Backend Developer',
  },
};

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  SUPERADMIN: { email: 'superadmin@company.com', pass: 'admin123' },
  HR: { email: 'hr@company.com', pass: 'admin123' },
  MANAGER: { email: 'manager@company.com', pass: 'admin123' },
  EMPLOYEE: { email: 'employee@company.com', pass: 'admin123' },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hr_current_user');
    return saved ? JSON.parse(saved) : null; // Không auto-login, bắt buộc đăng nhập
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('hr_current_user', JSON.stringify(user));
      // Chỉ tạo mock token nếu chưa có token nào (kể cả JWT thật)
      if (!localStorage.getItem('hr_access_token')) {
        localStorage.setItem('hr_access_token', `mock_jwt_token_${user.role.toLowerCase()}`);
      }
    } else {
      localStorage.removeItem('hr_current_user');
      localStorage.removeItem('hr_access_token');
    }
  }, [user]);

  const login = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creds.email, password: creds.pass }),
      });
      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        const u = data.data.user;
        const loggedUser: User = {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          departmentName: u.department,
          jobTitle: u.jobTitle,
        };
        localStorage.setItem('hr_access_token', data.data.accessToken);
        localStorage.setItem('hr_current_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        return;
      }
    } catch (e) {
      console.warn('Backend login fallback:', e);
    }
    const selected = mockUsers[role];
    localStorage.setItem('hr_access_token', `mock_jwt_token_${role.toLowerCase()}`);
    setUser(selected);
  };

  const setAuthSession = (newUser: User, token: string) => {
    localStorage.setItem('hr_access_token', token);
    setUser(newUser);
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
