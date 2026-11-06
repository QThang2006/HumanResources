import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import type { UserRole } from '../types';
import { Bot, ShieldCheck, UserCheck, Briefcase, User, LogIn, KeyRound, Mail, CheckCircle2, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, setAuthSession, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('superadmin@company.com');
  const [password, setPassword] = useState('admin123');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await authApi.login({ email: targetEmail, password: targetPass });
      setAuthSession(res.user, res.accessToken);
      if (res.user.role === 'EMPLOYEE') {
        navigate('/employee/workspace');
      } else if (res.user.role === 'SUPERADMIN') {
        navigate('/admin/settings');
      } else {
        navigate('/admin/recruitment');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleQuickFill = (role: UserRole) => {
    let targetEmail = 'superadmin@company.com';
    const targetPass = 'admin123';

    if (role === 'SUPERADMIN') targetEmail = 'superadmin@company.com';
    else if (role === 'HR') targetEmail = 'hr@company.com';
    else if (role === 'MANAGER') targetEmail = 'manager@company.com';
    else if (role === 'EMPLOYEE') targetEmail = 'employee@company.com';

    setEmail(targetEmail);
    setPassword(targetPass);
    executeLogin(targetEmail, targetPass);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {/* Logo & Tiêu đề */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Đăng Nhập Cổng Nội Bộ
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Hệ thống Quản trị Tuyển dụng & Nhân sự TalentHunt ATS
          </p>
        </div>

        {/* Trạng thái nếu đã đăng nhập */}
        {isAuthenticated && user && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Đang đăng nhập: {user.fullName}
            </div>
            <div className="text-[11px] text-emerald-700 mb-3">
              Vai trò: <span className="font-bold underline">{user.role}</span> ({user.jobTitle || 'Cán bộ nhân viên'})
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (user.role === 'EMPLOYEE') navigate('/employee/workspace');
                  else if (user.role === 'SUPERADMIN') navigate('/admin/settings');
                  else navigate('/admin/recruitment');
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors text-center shadow-sm"
              >
                Vào Hệ Thống &rarr;
              </button>
              <button
                onClick={logout}
                className="px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold py-2 rounded-lg transition-colors"
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        )}

        {/* Form Đăng Nhập Tiêu Chuẩn */}
        <form onSubmit={handleFormSubmit} className="space-y-4 mb-6 text-left">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {errorMessage}
              {errorMessage.includes('phong tỏa') && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authApi.unblockIp('127.0.0.1');
                      setErrorMessage('Đã mở khóa IP [127.0.0.1]. Bạn có thể đăng nhập lại.');
                    } catch (e: any) {
                      setErrorMessage('Lỗi khi mở khóa: ' + (e.message || 'Không thể kết nối Backend'));
                    }
                  }}
                  className="mt-2 w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-lg transition block text-center"
                >
                  Mở khóa IP cho phiên này
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email công vụ:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: superadmin@company.com, hr@company.com..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold h-10 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Đăng Nhập
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-medium text-xs">
              Hoặc chọn tài khoản theo vai trò (RBAC)
            </span>
          </div>
        </div>

        {/* 4 Thẻ Đăng Nhập Nhanh Cho Demo & Test Phân Quyền */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRoleQuickFill('SUPERADMIN')}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 transition-colors text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block group-hover:text-rose-600">
                  SuperAdmin (IT Ops)
                </span>
                <span className="text-[10px] text-slate-500 block">Quản trị RBAC, cấu hình API Key</span>
              </div>
            </div>
            <span className="text-xs text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Vào &rarr;</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRoleQuickFill('HR')}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block group-hover:text-blue-600">
                  HR (Talent Acquisition)
                </span>
                <span className="text-[10px] text-slate-500 block">Đăng Job AI, ATS Kanban, 1-Click Hire</span>
              </div>
            </div>
            <span className="text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Vào &rarr;</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRoleQuickFill('MANAGER')}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-colors text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block group-hover:text-amber-600">
                  Manager (Trưởng Phòng Tech)
                </span>
                <span className="text-[10px] text-slate-500 block">Chấm điểm PV Kỹ thuật, Team Mood</span>
              </div>
            </div>
            <span className="text-xs text-amber-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Vào &rarr;</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRoleQuickFill('EMPLOYEE')}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block group-hover:text-emerald-600">
                  Employee (Nhân Viên Mới)
                </span>
                <span className="text-[10px] text-slate-500 block">Checklist 30 ngày, Copilot RAG, Đào tạo AI</span>
              </div>
            </div>
            <span className="text-xs text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Vào &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
