import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users.api';
import { systemConfigApi } from '../api/system-config.api';
import type { User, UserRole } from '../types';
import { Badge } from '../components/common';
import {
  ShieldCheck,
  Settings,
  BookOpen,
  ShieldAlert,
  Code2,
  Key,
  Lock,
  GraduationCap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
} from 'lucide-react';

// ─── Kiểu dữ liệu trả về từ API (department là object lồng nhau) ───────────
interface UserWithDept extends User {
  department?: { id: number; name: string; description?: string };
  isActive?: boolean;
  joinedDate?: string;
}

// ─── Map Role → variant Badge có sẵn ──────────────────────────────────────
const ROLE_BADGE_VARIANT: Record<UserRole, 'danger' | 'purple' | 'warning' | 'default'> = {
  SUPERADMIN: 'danger',
  HR: 'purple',
  MANAGER: 'warning',
  EMPLOYEE: 'default',
};

// ─── Nhãn hiển thị cho từng Role ──────────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'Super Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];


// ─── Component con: Bảng danh sách nhân sự & phân quyền ───────────────────
const RbacTable: React.FC<{ currentUserId: number }> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserWithDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getAll();
      setUsers(data as UserWithDept[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách nhân sự.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (targetUser: UserWithDept, newRole: UserRole) => {
    if (newRole === targetUser.role) return;
    setUpdatingId(targetUser.id);
    try {
      const result = await usersApi.updateRole(targetUser.id, newRole);
      // Cập nhật state local ngay, không cần gọi lại API
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      showToast('success', result.message || `Đã cập nhật vai trò của "${targetUser.fullName}" thành [${newRole}].`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật vai trò.';
      showToast('error', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  // Lấy tên phòng ban từ dữ liệu API (department là object lồng nhau)
  const getDeptName = (u: UserWithDept): string =>
    u.department?.name || u.departmentName || '—';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 duration-300 max-w-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          }
          <span className="leading-snug">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" /> Danh Sách Cán Bộ & Phân Bổ Vai Trò
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ SuperAdmin mới có thẩm quyền thay đổi vai trò (Role) của nhân sự trong doanh nghiệp
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-40 transition-colors"
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2.5 py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Đang tải danh sách nhân sự...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Không thể tải dữ liệu</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-xs font-bold text-rose-700 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Users className="w-10 h-10 text-slate-200" />
          <p className="text-sm">Chưa có dữ liệu nhân sự nào.</p>
        </div>
      )}

      {/* Bảng dữ liệu */}
      {!loading && !error && users.length > 0 && (
        <>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Họ & Tên', 'Email', 'Phòng Ban', 'Chức Danh', 'Vai Trò Hiện Tại', 'Thao Tác'].map(col => (
                    <th
                      key={col}
                      className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u, idx) => {
                  // ID 1 là tài khoản gốc không được phép thay đổi (backend cũng chặn)
                  const isRootAdmin = u.id === 1;
                  // Không cho đổi role của chính mình để tránh tự mất quyền
                  const isSelf = u.id === currentUserId;
                  const isUpdating = updatingId === u.id;
                  const canEdit = !isRootAdmin && !isSelf;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* STT */}
                      <td className="py-3.5 px-3 text-xs text-slate-400 font-mono">
                        {String(idx + 1).padStart(2, '0')}
                      </td>

                      {/* Họ tên */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{u.fullName}</span>
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                            Bạn
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-3 text-xs text-slate-500">{u.email}</td>

                      {/* Phòng ban */}
                      <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {getDeptName(u)}
                      </td>

                      {/* Chức danh */}
                      <td className="py-3.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {u.jobTitle || '—'}
                      </td>

                      {/* Vai trò hiện tại */}
                      <td className="py-3.5 px-3">
                        <Badge variant={ROLE_BADGE_VARIANT[u.role]} size="sm">
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-3">
                        {isRootAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                            <Lock className="w-3 h-3" />
                            Tài khoản gốc
                          </span>
                        ) : isSelf ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Tài khoản của bạn
                          </span>
                        ) : isUpdating ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Đang lưu...
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={!canEdit}
                            onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium
                              focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400
                              hover:border-slate-300 cursor-pointer transition-colors
                              disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {ALL_ROLES.map(role => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer tổng kết */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Tổng cộng <span className="font-bold text-slate-600">{users.length}</span> nhân sự
            </p>
            <div className="flex items-center gap-3">
              {ALL_ROLES.map(role => (
                <span key={role} className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Badge variant={ROLE_BADGE_VARIANT[role]} size="sm">{ROLE_LABELS[role]}</Badge>
                  <span>{users.filter(u => u.role === role).length}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Component chính ───────────────────────────────────────────────────────
export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rbac' | 'api' | 'rag' | 'courses'>('rbac');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  useEffect(() => {
    const loadSystemConfig = async () => {
      try {
        const config = await systemConfigApi.get();

        setGeminiApiKey(config.geminiApiKey || '');
        setN8nWebhookUrl(config.n8nWebhookUrl || '');
      } catch (error) {
        console.error('Không thể tải cấu hình hệ thống:', error);
      }
    };

    loadSystemConfig();
  }, []);
  const handleSaveConfig = async () => {
    const n8nUrl = n8nWebhookUrl.trim();

    if (n8nUrl) {
      try {
        const parsedUrl = new URL(n8nUrl);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          setConfigMessage('Webhook n8n phải sử dụng http:// hoặc https://');
          return;
        }
      } catch {
        setConfigMessage('Địa chỉ n8n Webhook không hợp lệ.');
        return;
      }
    }
    try {
      setConfigSaving(true);
      setConfigMessage('');

      const result = await systemConfigApi.update({
        geminiApiKey: geminiApiKey || undefined,
        n8nWebhookUrl: n8nWebhookUrl || undefined,
      });

      setGeminiApiKey(result.geminiApiKey);
      setN8nWebhookUrl(result.n8nWebhookUrl);
      setConfigMessage('Đã lưu cấu hình thành công.');
    } catch (error) {
      console.error(error);
      setConfigMessage('Lưu cấu hình thất bại.');
    } finally {
      setConfigSaving(false);
    }
  };
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

          {/* Tab 1: Phân Quyền RBAC — đã triển khai Bước 1 */}
          {activeTab === 'rbac' && (
            <RbacTable currentUserId={user.id} />
          )}

          {/* Tab 2: Cấu hình API — chờ Bước 2 */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Settings className="w-4 h-4 text-rose-600" /> Cấu Hình Khóa Tích Hợp Đám Mây
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Quản trị kết nối Google Gemini API và Webhook n8n Automation Engine
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gemini API Key
                  </label>
                  <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Nhập Gemini API Key"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    n8n Webhook Endpoint
                  </label>
                  <input
                      type="text"
                      value={n8nWebhookUrl}
                      onChange={(e) => setN8nWebhookUrl(e.target.value)}
                      placeholder="http://localhost:5678/webhook"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                      type="button"
                      onClick={handleSaveConfig}
                      disabled={configSaving}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    {configSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>
                {configMessage && (
                    <p className="text-sm text-slate-600">
                      {configMessage}
                    </p>
                )}
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
