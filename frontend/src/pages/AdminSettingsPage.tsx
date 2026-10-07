import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Database,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react';

import { systemConfigApi } from '../api/system-config.api';
import { usersApi } from '../api/users.api';
import { Badge } from '../components/common';
import { KnowledgeBasePanel } from '../components/KnowledgeBasePanel';
import { TrainingPanel } from '../components/TrainingPanel';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole } from '../types';

interface UserWithDept extends User {
  department?: {
    id: number;
    name: string;
    description?: string;
  };
  isActive?: boolean;
  joinedDate?: string;
}

type AdminTab = 'rbac' | 'api' | 'rag' | 'courses';

const ROLE_BADGE_VARIANT: Record<
  UserRole,
  'danger' | 'purple' | 'warning' | 'default'
> = {
  SUPERADMIN: 'danger',
  HR: 'purple',
  MANAGER: 'warning',
  EMPLOYEE: 'default',
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'Super Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'rbac', label: 'People & Access', icon: ShieldCheck },
  { id: 'api', label: 'Integrations', icon: Workflow },
  { id: 'rag', label: 'Knowledge', icon: Database },
  { id: 'courses', label: 'Learning', icon: GraduationCap },
];

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
};

const ConnectionStatus: React.FC<{
  success: boolean | null;
  text: string;
}> = ({ success, text }) => {
  if (!text) return null;

  return (
    <div
      className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        success === true
          ? 'border-[#CDE3D6] bg-[#F2F8F4] text-[#2F6B4F]'
          : success === false
            ? 'border-[#EDC7CC] bg-[#FBF1F2] text-[#9D4150]'
            : 'border-[#D9DDDE] bg-[#F4F5F5] text-[#716B65]'
      }`}
    >
      {success === true ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : success === false ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      <span>{text}</span>
    </div>
  );
};

const RbacTable: React.FC<{ currentUserId: number }> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserWithDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await usersApi.getAll();
      setUsers(data as UserWithDept[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách nhân sự.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (
    targetUser: UserWithDept,
    newRole: UserRole,
  ) => {
    if (newRole === targetUser.role) return;

    setUpdatingId(targetUser.id);
    try {
      const result = await usersApi.updateRole(targetUser.id, newRole);
      setUsers(prev =>
        prev.map(item =>
          item.id === targetUser.id ? { ...item, role: newRole } : item,
        ),
      );
      showToast(
        'success',
        result.message ||
          `Đã cập nhật vai trò của ${targetUser.fullName} thành ${ROLE_LABELS[newRole]}.`,
      );
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Không thể cập nhật vai trò.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getDeptName = (item: UserWithDept) =>
    item.department?.name || item.departmentName || 'Chưa phân phòng';

  const roleCounts = useMemo(() => {
    return ALL_ROLES.reduce(
      (acc, role) => {
        acc[role] = users.filter(item => item.role === role).length;
        return acc;
      },
      {} as Record<UserRole, number>,
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter(item => {
      const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
      const searchable = [
        item.fullName,
        item.email,
        item.jobTitle,
        getDeptName(item),
        ROLE_LABELS[item.role],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesRole && (!keyword || searchable.includes(keyword));
    });
  }, [roleFilter, searchTerm, users]);

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 flex max-w-md items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-2xl ${
            toast.type === 'success'
              ? 'border-[#CDE3D6] text-[#2F6B4F]'
              : 'border-[#EDC7CC] text-[#9D4150]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="leading-5">{toast.message}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#1D2023]">
                People & access
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#989FA4]" />
                <input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Tìm tên, email, phòng ban..."
                  className="h-11 w-full rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] pl-10 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                />
              </div>

              <select
                value={roleFilter}
                onChange={event =>
                  setRoleFilter(event.target.value as 'ALL' | UserRole)
                }
                className="h-11 rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] px-4 text-sm font-semibold text-[#52585D] outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10"
              >
                <option value="ALL">Tất cả vai trò</option>
                {ALL_ROLES.map(role => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#D8DCDE] bg-white px-4 text-sm font-bold text-[#52585D] transition hover:bg-[#F2F4F4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="rounded-full bg-[#202326] px-3 py-1.5 text-xs font-bold text-white">
              {users.length} nhân sự
            </div>
            {ALL_ROLES.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  roleFilter === role
                    ? 'border-[#8A4153] bg-[#F6E9ED] text-[#6F3042]'
                    : 'border-[#E2E5E7] bg-white text-[#72797E] hover:bg-[#F8F9F9]'
                }`}
              >
                {ROLE_LABELS[role]} · {roleCounts[role] || 0}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex min-h-80 items-center justify-center gap-3 text-[#82898E]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-semibold">Đang tải dữ liệu...</span>
          </div>
        )}

        {error && !loading && (
          <div className="m-5 rounded-2xl border border-[#EDC7CC] bg-[#FBF1F2] p-4 sm:m-7">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#9D4150]" />
              <div>
                <p className="text-sm font-bold text-[#713441]">
                  Không thể tải danh sách nhân sự
                </p>
                <p className="mt-1 text-xs text-[#9D5965]">{error}</p>
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="mt-3 text-xs font-black text-[#6F3042] underline underline-offset-4"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF1F2] text-[#8A8179]">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-black text-[#303438]">
              Không có kết quả phù hợp
            </p>
            <p className="mt-1 text-xs text-[#7F868B]">
              Thử đổi từ khóa hoặc bộ lọc vai trò.
            </p>
          </div>
        )}

        {!loading && !error && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-[#E8EAEC] bg-[#F8F9F9]">
                  {[
                    'Nhân sự',
                    'Phòng ban',
                    'Chức danh',
                    'Vai trò',
                    'Trạng thái',
                    'Quyền truy cập',
                  ].map(column => (
                    <th
                      key={column}
                      className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-[#90979C] sm:px-7"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E9ECEC]">
                {filteredUsers.map(item => {
                  const isRootAdmin = item.id === 1;
                  const isSelf = item.id === currentUserId;
                  const isUpdating = updatingId === item.id;
                  const canEdit = !isRootAdmin && !isSelf;

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-[#FFFFFF]"
                    >
                      <td className="px-5 py-4 sm:px-7">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#202326] text-xs font-black text-white shadow-sm">
                            {getInitials(item.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-[#27211E]">
                                {item.fullName}
                              </p>
                              {isSelf && (
                                <span className="rounded-full bg-[#EFF1F2] px-2 py-0.5 text-[10px] font-bold text-[#72797E]">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[#7F868B]">
                              {item.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#636A70]">
                          <Building2 className="h-3.5 w-3.5 text-[#9DA4A9]" />
                          {getDeptName(item)}
                        </div>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#636A70]">
                          <BriefcaseBusiness className="h-3.5 w-3.5 text-[#9DA4A9]" />
                          {item.jobTitle || 'Chưa cập nhật'}
                        </div>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <Badge
                          variant={ROLE_BADGE_VARIANT[item.role]}
                          size="sm"
                        >
                          {ROLE_LABELS[item.role]}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            item.isActive === false
                              ? 'bg-[#ECEEEE] text-[#7C746D]'
                              : 'bg-[#EFF7F1] text-[#2F6B4F]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.isActive === false
                                ? 'bg-[#90979C]'
                                : 'bg-[#4C8C6A]'
                            }`}
                          />
                          {item.isActive === false ? 'Tạm khóa' : 'Hoạt động'}
                        </span>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        {isRootAdmin ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#90979C]">
                            <Lock className="h-3.5 w-3.5" />
                            Tài khoản gốc
                          </span>
                        ) : isSelf ? (
                          <span className="text-xs font-semibold text-[#90979C]">
                            Không thể tự đổi quyền
                          </span>
                        ) : isUpdating ? (
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#7D756E]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang cập nhật...
                          </span>
                        ) : (
                          <select
                            value={item.role}
                            disabled={!canEdit}
                            onChange={event =>
                              handleRoleChange(
                                item,
                                event.target.value as UserRole,
                              )
                            }
                            className="h-9 rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-xs font-bold text-[#53595E] outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10 disabled:cursor-not-allowed disabled:opacity-50"
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
        )}
      </section>
    </div>
  );
};

const IntegrationsPanel: React.FC<{
  geminiApiKey: string;
  n8nWebhookUrl: string;
  configSaving: boolean;
  configMessage: string;
  geminiTesting: boolean;
  geminiTestMessage: string;
  geminiTestSuccess: boolean | null;
  n8nTesting: boolean;
  n8nTestMessage: string;
  n8nTestSuccess: boolean | null;
  onGeminiKeyChange: (value: string) => void;
  onN8nUrlChange: (value: string) => void;
  onTestGemini: () => void;
  onTestN8n: () => void;
  onSave: () => void;
}> = props => {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
      <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-xl font-black tracking-tight text-[#1D2023]">
          Integrations
        </h2>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-[#E8EAEC] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6E9ED] text-[#6F3042]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#202326]">Gemini AI</h3>
                <p className="mt-0.5 text-xs text-[#7F868B]">AI service</p>
              </div>
            </div>
            {props.geminiTestSuccess === true && (
              <span className="rounded-full bg-[#EFF7F1] px-2.5 py-1 text-[11px] font-bold text-[#2F6B4F]">
                Connected
              </span>
            )}
          </div>

          <label className="mt-6 block text-[11px] font-black uppercase tracking-[0.14em] text-[#90979C]">
            API key
          </label>
          <div className="relative mt-2">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
            <input
              type="password"
              value={props.geminiApiKey}
              onChange={event => props.onGeminiKeyChange(event.target.value)}
              placeholder="Gemini API Key"
              className="h-12 w-full rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] pl-10 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={props.onTestGemini}
              disabled={props.geminiTesting}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D3D8DA] bg-white px-4 text-xs font-black text-[#666D72] transition hover:bg-[#F2F4F4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.geminiTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {props.geminiTesting ? 'Đang kiểm tra...' : 'Test connection'}
            </button>
          </div>

          <ConnectionStatus
            success={props.geminiTestSuccess}
            text={props.geminiTestMessage}
          />
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF1F1] text-[#A26D3F]">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#202326]">n8n</h3>
                <p className="mt-0.5 text-xs text-[#7F868B]">Automation service</p>
              </div>
            </div>
            {props.n8nTestSuccess === true && (
              <span className="rounded-full bg-[#EFF7F1] px-2.5 py-1 text-[11px] font-bold text-[#2F6B4F]">
                Connected
              </span>
            )}
          </div>

          <label className="mt-6 block text-[11px] font-black uppercase tracking-[0.14em] text-[#90979C]">
            Webhook endpoint
          </label>
          <div className="relative mt-2">
            <Workflow className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
            <input
              type="text"
              value={props.n8nWebhookUrl}
              onChange={event => props.onN8nUrlChange(event.target.value)}
              placeholder="http://localhost:5678/webhook/..."
              className="h-12 w-full rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] pl-10 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={props.onTestN8n}
              disabled={props.n8nTesting || !props.n8nWebhookUrl.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D3D8DA] bg-white px-4 text-xs font-black text-[#666D72] transition hover:bg-[#F2F4F4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.n8nTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {props.n8nTesting ? 'Đang kiểm tra...' : 'Test connection'}
            </button>
          </div>

          <ConnectionStatus
            success={props.n8nTestSuccess}
            text={props.n8nTestMessage}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#E8EAEC] bg-[#FFFFFF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p
          className={`text-xs font-semibold ${
            props.configMessage.toLowerCase().includes('thành công')
              ? 'text-[#2F6B4F]'
              : props.configMessage
                ? 'text-[#9D4150]'
                : 'text-[#82898E]'
          }`}
        >
          {props.configMessage || ' '}
        </p>

        <button
          type="button"
          onClick={props.onSave}
          disabled={props.configSaving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6F3042] px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(111,48,66,0.18)] transition hover:bg-[#5D2737] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.configSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {props.configSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
    </section>
  );
};

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('rbac');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  const [n8nTesting, setN8nTesting] = useState(false);
  const [n8nTestMessage, setN8nTestMessage] = useState('');
  const [n8nTestSuccess, setN8nTestSuccess] = useState<boolean | null>(null);

  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiTestMessage, setGeminiTestMessage] = useState('');
  const [geminiTestSuccess, setGeminiTestSuccess] =
    useState<boolean | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;

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
  }, [user?.role]);

  const handleSaveConfig = async () => {
    const n8nUrl = n8nWebhookUrl.trim();

    if (n8nUrl) {
      try {
        const parsedUrl = new URL(n8nUrl);
        if (
          parsedUrl.protocol !== 'http:' &&
          parsedUrl.protocol !== 'https:'
        ) {
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

      setGeminiApiKey(result.geminiApiKey || '');
      setN8nWebhookUrl(result.n8nWebhookUrl || '');
      setConfigMessage('Đã lưu cấu hình thành công.');
    } catch (error) {
      console.error(error);
      setConfigMessage('Lưu cấu hình thất bại.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestN8n = async () => {
    const url = n8nWebhookUrl.trim();

    if (!url) {
      setN8nTestSuccess(false);
      setN8nTestMessage('Vui lòng nhập n8n Webhook Endpoint.');
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (
        parsedUrl.protocol !== 'http:' &&
        parsedUrl.protocol !== 'https:'
      ) {
        setN8nTestSuccess(false);
        setN8nTestMessage('Webhook phải sử dụng http:// hoặc https://');
        return;
      }
    } catch {
      setN8nTestSuccess(false);
      setN8nTestMessage('Địa chỉ n8n Webhook không hợp lệ.');
      return;
    }

    try {
      setN8nTesting(true);
      setN8nTestSuccess(null);
      setN8nTestMessage('Đang kiểm tra kết nối...');
      const result = await systemConfigApi.testN8n(url);
      setN8nTestSuccess(true);
      setN8nTestMessage(result.message || 'Kết nối n8n thành công.');
    } catch (error) {
      console.error(error);
      setN8nTestSuccess(false);
      setN8nTestMessage(
        error instanceof Error ? error.message : 'Không thể kết nối tới n8n.',
      );
    } finally {
      setN8nTesting(false);
    }
  };

  const handleTestGemini = async () => {
    try {
      setGeminiTesting(true);
      setGeminiTestSuccess(null);
      setGeminiTestMessage('Đang kiểm tra kết nối...');
      const result = await systemConfigApi.testGemini();
      setGeminiTestSuccess(true);
      setGeminiTestMessage(
        `${result.message}${result.model ? ` • ${result.model}` : ''}`,
      );
    } catch (error) {
      console.error(error);
      setGeminiTestSuccess(false);
      setGeminiTestMessage(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối tới Google Gemini AI.',
      );
    } finally {
      setGeminiTesting(false);
    }
  };

  if (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') {
    return (
      <div className="min-h-full bg-[#F4F5F5] px-4 py-20">
        <div className="mx-auto max-w-lg rounded-[24px] border border-[#E1E4E5] bg-white p-8 text-center shadow-[0_20px_60px_rgba(63,48,40,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F6E9ED] text-[#6F3042]">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-[#1D2023]">
            Không có quyền truy cập
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#72797E]">
            Khu vực quản trị chỉ dành cho SuperAdmin hoặc HR.
          </p>
        </div>
      </div>
    );
  }

  if (user?.role === 'HR') {
    return (
      <div className="min-h-full bg-[#F4F5F5]">
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 border-b border-[#DDE1E2] pb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A98562]">
              Human Resources
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1D2023]">
              Knowledge & learning
            </h1>
            <p className="mt-2 text-sm text-[#72797E]">
              Quản lý tri thức nội bộ và chương trình đào tạo.
            </p>
          </div>

          <div className="space-y-6">
            <KnowledgeBasePanel />
            <TrainingPanel />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-full bg-[#F4F5F5]">
      <div className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="grid gap-6 lg:grid-cols-[228px_minmax(0,1fr)] xl:gap-7">
          <aside className="h-fit rounded-[18px] border border-[#E1E4E5] bg-[#F7F8F8]/95 p-2 shadow-[0_10px_28px_rgba(45,34,28,0.05)] backdrop-blur lg:sticky lg:top-6">
            <nav className="space-y-1">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#2B2421] shadow-[0_6px_18px_rgba(45,34,28,0.06)]'
                        : 'text-[#757C81] hover:bg-white/70 hover:text-[#303438]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#6F3042]" />
                    )}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? 'bg-[#F4E7EB] text-[#6F3042]'
                          : 'bg-[#ECEEEE] text-[#7F868B]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-black">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            {activeTab === 'rbac' && (
              <RbacTable currentUserId={user!.id} />
            )}

            {activeTab === 'api' && (
              <IntegrationsPanel
                geminiApiKey={geminiApiKey}
                n8nWebhookUrl={n8nWebhookUrl}
                configSaving={configSaving}
                configMessage={configMessage}
                geminiTesting={geminiTesting}
                geminiTestMessage={geminiTestMessage}
                geminiTestSuccess={geminiTestSuccess}
                n8nTesting={n8nTesting}
                n8nTestMessage={n8nTestMessage}
                n8nTestSuccess={n8nTestSuccess}
                onGeminiKeyChange={value => {
                  setGeminiApiKey(value);
                  setConfigMessage('');
                  setGeminiTestSuccess(null);
                  setGeminiTestMessage('');
                }}
                onN8nUrlChange={value => {
                  setN8nWebhookUrl(value);
                  setConfigMessage('');
                  setN8nTestSuccess(null);
                  setN8nTestMessage('');
                }}
                onTestGemini={handleTestGemini}
                onTestN8n={handleTestN8n}
                onSave={handleSaveConfig}
              />
            )}

            {activeTab === 'rag' && <KnowledgeBasePanel />}
            {activeTab === 'courses' && <TrainingPanel />}
          </main>
        </div>
      </div>
    </div>
  );
};
