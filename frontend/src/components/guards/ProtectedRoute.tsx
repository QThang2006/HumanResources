import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">403 - Quyền Truy Cập Bị Chặn</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Bạn đang đăng nhập với vai trò <span className="font-bold text-rose-600">[{user.role}]</span>. Trang này yêu cầu một trong các quyền: <span className="font-semibold text-slate-700">{allowedRoles.join(', ')}</span>.
          </p>
          <div className="mt-6">
            <Link
              to={
                user.role === 'EMPLOYEE'
                  ? '/employee/workspace'
                  : user.role === 'SUPERADMIN'
                  ? '/admin/settings'
                  : '/admin/recruitment'
              }
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay về không gian của bạn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};
