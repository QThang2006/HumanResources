import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import type { UserRole } from '../types';
import { Bot, ShieldCheck, UserCheck, Briefcase, User, LogIn, KeyRound, Mail, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

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
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-100">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Đăng Nhập Cổng Nội Bộ
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Hệ thống Quản trị Nhân sự & ATS Multi-Agent
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
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực bảo mật...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Đăng Nhập Ngay
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Hoặc Đăng Nhập Nhanh Theo Vai Trò (Tự Điền & Xác Thực Thật)
            </span>
          </div>
        </div>

        {/* 4 Thẻ Đăng Nhập Nhanh Cho Demo & Test Phân Quyền */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRoleQuickFill('SUPERADMIN')}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-rose-600">
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
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-600">
                  HR (Talent Acquisition)
                </span>
                <span className="text-[10px] text-slate-500 block">Đăng Job AI, ATS Kanban, 1-Click Hire</span>
              </div>
            </div>
            <span className="text-xs text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Vào &rarr;</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRoleQuickFill('MANAGER')}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-600">
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
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-600">
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
