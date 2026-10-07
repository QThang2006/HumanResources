import React, { createContext, useContext, useState } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
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

  const login = (role: UserRole) => {
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
