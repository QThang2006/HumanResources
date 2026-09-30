import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Settings, 
  BookOpen, 
  ShieldAlert, 
  Code2, 
  Key, 
  Lock, 
  GraduationCap
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rbac' | 'api' | 'rag' | 'courses'>('rbac');

  // Chặn quyền truy cập nếu là MANAGER hoặc EMPLOYEE (403 Forbidden)
  if (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">403 - Quyền Truy Cập Bị Chặn</h1>
        <p className="text-xs text-slate-500 mt-2">
          Khu vực này chỉ dành riêng cho <strong>SuperAdmin (IT Ops)</strong> hoặc <strong>HR (Quản trị Nhân sự)</strong>. Vai trò hiện tại của bạn là <span className="font-bold text-rose-600">[{user?.role}]</span> không đủ thẩm quyền truy cập.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. GÓC NHÌN DÀNH CHO SUPERADMIN (IT OPS) */}
      {user?.role === 'SUPERADMIN' && (
        <div className="space-y-6">
          {/* Banner hướng dẫn Thành viên 1 */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded-full">
                  Khung Sườn Chờ Code • Sprint 1
                </span>
                <span className="text-xs font-bold text-rose-900">
                  Trung Tâm Quản Trị Hệ Thống & Phân Quyền (IT Admin Console)
                </span>
              </div>
              <p className="text-xs text-rose-700/90 mt-1">
                📌 <strong>Phân công: Thành viên 1 (Trưởng nhóm)</strong> sẽ quản trị bảng <code className="bg-white/80 px-1 rounded">users</code>, viết API cập nhật Role (<code className="bg-white/80 px-1 rounded">PATCH /api/users/:id/role</code>) và cấu hình khóa bí mật API.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rbac'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Cơ Cấu & Phân Quyền (RBAC)
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'api'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Key className="w-4 h-4" /> Cấu Hình API & Bảo Mật
            </button>
          </div>

          {/* Tab 1: Phân Quyền RBAC */}
          {activeTab === 'rbac' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" /> Danh Sách Cán Bộ & Phân Bổ Vai Trò
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Chỉ SuperAdmin mới có thẩm quyền thay đổi vai trò (Role) của nhân sự trong doanh nghiệp
              </p>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
                Khung sườn bảng danh sách nhân viên • Thành viên 1 sẽ render bảng và dropdown đổi Role tại đây
              </div>
            </div>
          )}

          {/* Tab 2: Cấu hình API */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Settings className="w-4 h-4 text-rose-600" /> Cấu Hình Khóa Tích Hợp Đám Mây
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Quản trị kết nối Google Gemini API và Webhook n8n Automation Engine
              </p>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
                Khung sườn Form cấu hình API Key • Thành viên 1 sẽ kết nối tại đây
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. GÓC NHÌN DÀNH CHO HR */}
      {user?.role === 'HR' && (
        <div className="space-y-6">
          {/* Banner hướng dẫn HR */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full">
                  Khung Sườn Chờ Code • Sprint 2 & 4
                </span>
                <span className="text-xs font-bold text-indigo-900">
                  Kho Tri Thức Quy Chế & Danh Mục Khóa Học (L&D)
                </span>
              </div>
              <p className="text-xs text-indigo-700/90 mt-1">
                📌 <strong>Phân công: Thành viên 2 & 4</strong> sẽ kết nối bảng <code className="bg-white/80 px-1 rounded">documents</code> (upload PDF sổ tay) và bảng <code className="bg-white/80 px-1 rounded">training_courses</code> (quản lý khóa học nội bộ).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Kho Sổ Tay Quy Chế & RAG
              </h3>
              <p className="text-xs text-slate-500 mb-4">Nạp tài liệu PDF để làm giàu tri thức cho trợ lý AI Copilot</p>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                Khung sườn tải file PDF • Thành viên 4 sẽ tích hợp tải file tại đây
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" /> Danh Mục Khóa Đào Tạo AI (L&D)
              </h3>
              <p className="text-xs text-slate-500 mb-4">Quản trị các khóa bổ trợ kỹ năng cho nhân viên mới</p>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                Khung sườn khóa học • Thành viên 2 sẽ render danh mục tại đây
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
