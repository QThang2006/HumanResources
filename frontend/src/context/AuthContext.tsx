import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const saved = localStorage.getItem('hr_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('hr_current_user', JSON.stringify(user));
      // Tạo token demo tương ứng nếu chưa có
      if (!localStorage.getItem('hr_access_token')) {
        localStorage.setItem('hr_access_token', `mock_jwt_token_${user.role.toLowerCase()}`);
      }
    } else {
      localStorage.removeItem('hr_current_user');
      localStorage.removeItem('hr_access_token');
    }
  }, [user]);

  const login = (role: UserRole) => {
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
