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

const demoEmails: Record<UserRole, string> = {
  SUPERADMIN: 'superadmin@company.com',
  HR: 'hr@company.com',
  MANAGER: 'manager@company.com',
  EMPLOYEE: 'employee@company.com',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('hr_current_user');
      const token = localStorage.getItem('hr_access_token');
      if (saved && token) {
        const storedUser = JSON.parse(saved) as User;
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        // Reject sessions left inconsistent by the old UI-only role switch.
        if (Number(payload.sub) === Number(storedUser.id) && payload.role === storedUser.role)
          return storedUser;
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
    const session = await authApi.login({ email: demoEmails[role], password: 'admin123' });
    setAuthSession(session.user, session.accessToken);
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
