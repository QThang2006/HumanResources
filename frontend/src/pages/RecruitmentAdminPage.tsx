import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Sparkles, 
  Plus, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert, 
  Code2,
  FileCheck,
  ChevronRight
} from 'lucide-react';

export const RecruitmentAdminPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. GÓC NHÌN DÀNH CHO HR: BÀN ĐIỀU HÀNH ATS & KANBAN */}
      {user?.role === 'HR' && (
        <div>
          {/* Banner hướng dẫn Thành viên 2 */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full">
                  Khung Sườn Chờ Code • Sprint 2 & 3
                </span>
                <span className="text-xs font-bold text-indigo-900">
                  Bàn Quản Trị Tuyển Dụng ATS Dành Cho HR
                </span>
              </div>
              <p className="text-xs text-indigo-700/90 mt-1">
                📌 <strong>Phân công: Thành viên 2</strong> sẽ kết nối API lấy danh sách ứng viên, kéo thả các cột Kanban, tích hợp nút <em>+ Tạo Nhanh Job Bằng AI</em> và nút <em>1-Click Tuyển Dụng</em>.
              </p>
            </div>
          </div>

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Bàn Tuyển Dụng ATS Toàn Công Ty
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý các vòng tuyển dụng từ ứng tuyển đến nhận việc
              </p>
            </div>
            <button
              disabled
              className="bg-indigo-600/60 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> + Tạo Nhanh Job Bằng AI (Chờ Code)
            </button>
          </div>

          {/* Khung Sườn Kanban 4 Cột Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Cột 1: Ứng Tuyển Mới */}
            <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Mới Ứng Tuyển
                </span>
                <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  1
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-900">Nguyễn Văn Thành</h4>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> 88.5%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Senior Backend Developer</p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-indigo-600 font-semibold flex items-center justify-between">
                  <span>Chờ HR xếp lịch</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Cột 2: Đang Phỏng Vấn */}
            <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Đang Phỏng Vấn
                </span>
                <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  0
                </span>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                Trống
              </div>
            </div>

            {/* Cột 3: Đề Xuất Nhận Việc */}
            <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Đề Xuất Offer
                </span>
                <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  0
                </span>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                Trống
              </div>
            </div>

            {/* Cột 4: Đã Tuyển Dụng */}
            <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã Tuyển Dụng
                </span>
                <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  0
                </span>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                Trống
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GÓC NHÌN DÀNH CHO MANAGER: GÓC PHỎNG VẤN CHUYÊN MÔN */}
      {user?.role === 'MANAGER' && (
        <div>
          {/* Banner hướng dẫn Thành viên 3 */}
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full">
                  Khung Sườn Chờ Code • Sprint 3
                </span>
                <span className="text-xs font-bold text-amber-900">
                  Góc Phỏng Vấn Chuyên Môn Của Trưởng Phòng (Manager)
                </span>
              </div>
              <p className="text-xs text-amber-700/90 mt-1">
                📌 <strong>Phân công: Thành viên 3</strong> sẽ kết nối bảng <code className="bg-white/80 px-1 rounded">interviews</code>, hiển thị ứng viên thuộc phòng ban mình, xem 3 câu hỏi gợi ý của Gemini và form chấm điểm (1-100) Pass/Fail.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-600" /> Danh Sách Phỏng Vấn Kỹ Thuật (Phòng IT)
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Chỉ hiển thị các ứng viên đã được HR xếp lịch với Trưởng phòng chuyên môn
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400">
              <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">Khung sườn đã sẵn sàng • Thành viên 3 sẽ tích hợp phiếu chấm điểm kỹ thuật tại đây</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. GÓC NHÌN SUPERADMIN */}
      {user?.role === 'SUPERADMIN' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800">
          <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-rose-600" />
          <h2 className="text-base font-bold">Quyền Quản Trị Hệ Thống (SuperAdmin)</h2>
          <p className="text-xs text-rose-700 mt-1">
            SuperAdmin quản trị kỹ thuật, vui lòng chuyển sang trang <strong>Cài Đặt Hệ Thống & Phân Quyền (RBAC)</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
