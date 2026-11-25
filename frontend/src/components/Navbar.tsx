import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  Users,
  LayoutDashboard,
  Settings,
  Bot,
  LogOut,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = (path: string) =>
    `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition-colors lg:px-3 lg:text-sm ${
      isActive(path)
        ? 'bg-blue-50 text-blue-600 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const renderNavLinks = () => (
    <>
      {isAuthenticated && user?.role === 'HR' && (
        <>
          <Link to="/admin/recruitment" className={navLinkClass('/admin/recruitment')}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Bàn Tuyển Dụng ATS
          </Link>

          <Link to="/employee/workspace" className={navLinkClass('/employee/workspace')}>
            <Users className="h-4 w-4 shrink-0" />
            Giám sát Đội ngũ & Mood
          </Link>

          <Link to="/admin/settings" className={navLinkClass('/admin/settings')}>
            <Settings className="h-4 w-4 shrink-0" />
            Kho Tri Thức & Sổ Tay RAG
          </Link>

          <Link to="/careers" className={navLinkClass('/careers')}>
            <Briefcase className="h-4 w-4 shrink-0" />
            Cổng Việc Làm
          </Link>
        </>
      )}

      {isAuthenticated && user?.role === 'SUPERADMIN' && (
        <>
          <Link to="/admin/recruitment" className={navLinkClass('/admin/recruitment')}>
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            Góc Phỏng Vấn & Tuyển Dụng
          </Link>

          <Link to="/employee/workspace" className={navLinkClass('/employee/workspace')}>
            <Users className="h-4 w-4 shrink-0" />
            Giám sát Đội ngũ & Mood
          </Link>

          <Link to="/admin/settings" className={navLinkClass('/admin/settings')}>
            <Settings className="h-4 w-4 shrink-0" />
            Cài Đặt Hệ Thống
          </Link>

          <Link to="/careers" className={navLinkClass('/careers')}>
            <Briefcase className="h-4 w-4 shrink-0" />
            Cổng Việc Làm
          </Link>
        </>
      )}

      {isAuthenticated && user?.role === 'MANAGER' && (
        <>
          <Link to="/admin/recruitment" className={navLinkClass('/admin/recruitment')}>
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            Góc Phỏng Vấn Chuyên Môn
          </Link>

          <Link to="/admin/settings" className={navLinkClass('/admin/settings')}>
            <GraduationCap className="h-4 w-4 shrink-0" />
            Đào Tạo & Đánh Giá
          </Link>

          <Link to="/employee/workspace" className={navLinkClass('/employee/workspace')}>
            <Users className="h-4 w-4 shrink-0" />
            Không Gian Làm Việc
          </Link>
        </>
      )}

      {isAuthenticated && user?.role === 'EMPLOYEE' && (
        <>
          <Link to="/employee/workspace" className={navLinkClass('/employee/workspace')}>
            <Users className="h-4 w-4 shrink-0" />
            Không Gian Của Tôi (Onboarding)
          </Link>

          <Link to="/careers" className={navLinkClass('/careers')}>
            <Briefcase className="h-4 w-4 shrink-0" />
            Cổng Việc Làm
          </Link>
        </>
      )}

      {!isAuthenticated && (
        <Link to="/careers" className={navLinkClass('/careers')}>
          <Briefcase className="h-4 w-4 shrink-0" />
          Cổng Việc Làm
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex shrink-0 items-center">
            <Link to="/" className="group flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                <Bot className="h-5 w-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>

              <div className="leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-slate-900">
                    TalentHunt
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                    ATS
                  </span>
                </div>
                <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                  Enterprise Agentic Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
            {renderNavLinks()}
          </nav>

          {/* Account controls */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden text-right sm:block">
                  <span className="block max-w-[140px] truncate text-xs font-semibold text-slate-900">
                    {user?.fullName}
                  </span>
                  <span className="mt-0.5 inline-block rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                    {user?.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Đăng Nhập Nội Bộ
              </Link>
            )}
          </div>
        </div>

        {/* Mobile / Compact Navigation */}
        <nav
          aria-label="Điều hướng di động"
          className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 py-2 md:hidden"
        >
          {renderNavLinks()}
        </nav>
      </div>
    </header>
  );
};
