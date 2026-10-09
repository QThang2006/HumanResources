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
    `flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
      isActive(path)
        ? 'bg-[#F3E8EB] text-[#6F3042] shadow-[inset_0_0_0_1px_#E2CBD1]'
        : 'text-[#6D655F] hover:bg-[#F4F5F5] hover:text-[#292D30]'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E0E3E4] bg-[#FAFBFB]/95 shadow-[0_5px_24px_rgba(63,48,40,0.05)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center">
            <Link to="/" className="group flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#292D30] text-[#F5F6F6] shadow-[0_8px_20px_rgba(42,37,33,0.16)] transition-transform duration-200 group-hover:-translate-y-0.5">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#FAFBFB] bg-[#B48855]" />
              </div>

              <div className="leading-none">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-black tracking-[-0.025em] text-[#241F1C]">
                    HR Tech AI
                  </span>
                  <span className="rounded-full border border-[#DFCFC2] bg-[#F3F4F4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#9A6A3F]">
                    n8n
                  </span>
                </div>
                <span className="mt-1 block text-[10px] font-semibold tracking-[0.08em] text-[#8B8179]">
                  Enterprise Agentic ATS
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {/* SUPERADMIN deliberately has no duplicate /admin/settings link here. */}

            {isAuthenticated && user?.role === 'HR' && (
              <>
                <Link to="/admin/recruitment" className={navLinkClass('/admin/recruitment')}>
                  <LayoutDashboard className="h-4 w-4" />
                  Bàn Tuyển Dụng ATS
                </Link>

                <Link to="/admin/settings" className={navLinkClass('/admin/settings')}>
                  <Settings className="h-4 w-4" />
                  Kho Tri Thức & Sổ Tay RAG
                </Link>

                <Link to="/careers" className={navLinkClass('/careers')}>
                  <Briefcase className="h-4 w-4" />
                  Cổng Việc Làm
                </Link>
              </>
            )}

            {isAuthenticated && user?.role === 'MANAGER' && (
              <>
                <Link to="/admin/recruitment" className={navLinkClass('/admin/recruitment')}>
                  <ClipboardCheck className="h-4 w-4" />
                  Góc Phỏng Vấn Chuyên Môn
                </Link>

                <Link to="/employee/workspace" className={navLinkClass('/employee/workspace')}>
                  <Users className="h-4 w-4" />
                  Không Gian Làm Việc
                </Link>
              </>
            )}

            {isAuthenticated && user?.role === 'EMPLOYEE' && (
              <>
                <Link to="/employee/workspace" className={navLinkClass('/employee/workspace')}>
                  <Users className="h-4 w-4" />
                  Không Gian Của Tôi (Onboarding)
                </Link>

                <Link to="/careers" className={navLinkClass('/careers')}>
                  <Briefcase className="h-4 w-4" />
                  Cổng Việc Làm
                </Link>
              </>
            )}

            {!isAuthenticated && (
              <Link to="/careers" className={navLinkClass('/careers')}>
                <Briefcase className="h-4 w-4" />
                Cổng Việc Làm
              </Link>
            )}
          </nav>

          {/* Account controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden text-right sm:block">
                  <span className="block max-w-[120px] truncate text-xs font-black text-[#303438]">
                    {user?.fullName}
                  </span>
                  <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[0.12em] text-[#9A8F87]">
                    {user?.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8C827A] transition hover:bg-[#F3E8EB] hover:text-[#6F3042]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-[#6F3042] px-4 py-2 text-xs font-black text-white shadow-[0_8px_18px_rgba(111,48,66,0.2)] transition hover:bg-[#5E2938]"
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
