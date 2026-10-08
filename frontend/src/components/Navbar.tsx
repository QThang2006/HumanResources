import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { 
  Briefcase, 
  Users, 
  LayoutDashboard, 
  Settings, 
  Bot, 
  LogOut, 
  Sparkles,
  ClipboardCheck,
  ShieldCheck
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleRoleSwitch = async (targetRole: UserRole) => {
    await login(targetRole);
    // Tự động chuyển hướng đến màn hình chính tương ứng với Role
    if (targetRole === 'SUPERADMIN') {
      navigate('/admin/settings');
    } else if (targetRole === 'HR') {
      navigate('/admin/recruitment');
    } else if (targetRole === 'MANAGER') {
      navigate('/employee/workspace');
    } else {
      navigate('/employee/workspace');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between min-h-16 gap-3 py-3 items-center">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  HR Tech AI <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">n8n</span>
                </span>
                <span className="text-xs text-slate-500 block -mt-1 font-medium">Enterprise Agentic ATS</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links phân quyền sắc bén theo từng Role */}
          <nav className="hidden md:flex space-x-1 items-center">
            {/* 1. SUPERADMIN: Chỉ quản trị Hệ thống, Phân quyền & Cấu hình API */}
            {isAuthenticated && user?.role === 'SUPERADMIN' && (
              <Link
                to="/admin/settings"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/admin/settings')
                    ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                Hệ Thống & Phân Quyền (RBAC)
              </Link>
            )}

            {/* 2. HR: Quản lý Tuyển dụng toàn công ty & Sổ tay quy chế */}
            {isAuthenticated && user?.role === 'HR' && (
              <>
                <Link
                  to="/admin/recruitment"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/admin/recruitment')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Bàn Tuyển Dụng ATS
                </Link>
                <Link
                  to="/admin/settings"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/admin/settings')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Kho Tri Thức & Sổ Tay RAG
                </Link>
                <Link
                  to="/careers"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/careers')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Cổng Việc Làm
                </Link>
              </>
            )}

            {/* 3. MANAGER: Chỉ xem lịch phỏng vấn chuyên môn & Quản lý đội ngũ phòng mình */}
            {isAuthenticated && user?.role === 'MANAGER' && (
              <>
                <Link
                  to="/admin/recruitment"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/admin/recruitment')
                      ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4 text-amber-600" />
                  Góc Phỏng Vấn Chuyên Môn
                </Link>
                <Link
                  to="/employee/workspace"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/employee/workspace')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Không Gian Làm Việc
                </Link>
              </>
            )}

            {/* 4. EMPLOYEE: Không gian cá nhân (Checklist 30 ngày, Copilot Chat) */}
            {isAuthenticated && user?.role === 'EMPLOYEE' && (
              <>
                <Link
                  to="/employee/workspace"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/employee/workspace')
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  Không Gian Của Tôi (Onboarding)
                </Link>
                <Link
                  to="/careers"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/careers')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Cổng Việc Làm
                </Link>
              </>
            )}

            {/* Khi chưa đăng nhập */}
            {!isAuthenticated && (
              <Link
                to="/careers"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                Cổng Việc Làm
              </Link>
            )}
          </nav>

          {/* Right Action / Role Switcher for Demo (Chuyển góc nhìn tức thì) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Demo Role Switcher Badge */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200/80">
                  <span className="hidden xl:inline text-slate-500 font-bold px-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Role:
                  </span>
                  {(['SUPERADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      title={`Chuyển sang góc nhìn ${r}`}
                      className={`px-2 py-1 rounded-lg text-xs font-black transition-all ${
                        user?.role === r
                          ? r === 'SUPERADMIN'
                            ? 'bg-rose-600 text-white shadow'
                            : r === 'HR'
                            ? 'bg-indigo-600 text-white shadow'
                            : r === 'MANAGER'
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-emerald-600 text-white shadow'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {r === 'SUPERADMIN' ? 'ADMIN' : r}
                    </button>
                  ))}
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">{user?.fullName}</span>
                  <span className={`text-[10px] font-bold block ${
                    user?.role === 'SUPERADMIN' ? 'text-rose-600' :
                    user?.role === 'HR' ? 'text-indigo-600' :
                    user?.role === 'MANAGER' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {user?.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all"
              >
                Đăng Nhập Nội Bộ
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
