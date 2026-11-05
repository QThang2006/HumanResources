import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import '../styles/tv4-ui.css';

interface UserWithDept extends User {
  department?: {
    id: number;
    name: string;
    description?: string;
  };
  isActive?: boolean;
  joinedDate?: string;
}
interface DepartmentOption {
  id: number;
  name: string;
  code?: string;
  description?: string;
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
  { id: 'rbac', label: 'Người dùng & Phân quyền', icon: ShieldCheck },
  { id: 'api', label: 'Tích hợp', icon: Workflow },
  { id: 'rag', label: 'Kho tri thức', icon: Database },
  { id: 'courses', label: 'Đào tạo & Phát triển', icon: GraduationCap },
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
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentDescription, setDepartmentDescription] = useState('');
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    jobTitle: '',
    departmentId: '',
    role: 'EMPLOYEE' as UserRole,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingJobTitleId, setEditingJobTitleId] = useState<number | null>(null);
  const [jobTitleDraft, setJobTitleDraft] = useState('');
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
      const [userData, departmentData] = await Promise.all([
        usersApi.getAll(),
        usersApi.getDepartments(),
      ]);

      setUsers(userData as UserWithDept[]);
      setDepartments(departmentData);
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
  const handleDepartmentChange = async (
      targetUser: UserWithDept,
      departmentId: number,
  ) => {
    if (targetUser.department?.id === departmentId) return;

    const selectedDepartment = departments.find(
        department => department.id === departmentId,
    );

    if (!selectedDepartment) return;

    setUpdatingId(targetUser.id);

    try {
      const result = await usersApi.updateUser(targetUser.id, {
        departmentId,
      });

      setUsers(prev =>
          prev.map(item =>
              item.id === targetUser.id
                  ? {
                    ...item,
                    department: {
                      id: selectedDepartment.id,
                      name: selectedDepartment.name,
                      description: selectedDepartment.description,
                    },
                  }
                  : item,
          ),
      );

      showToast(
          'success',
          result.message ||
          `Đã cập nhật phòng ban của ${targetUser.fullName}.`,
      );
    } catch (err: unknown) {
      showToast(
          'error',
          err instanceof Error
              ? err.message
              : 'Không thể cập nhật phòng ban.',
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleSaveJobTitle = async (targetUser: UserWithDept) => {
    const newJobTitle = jobTitleDraft.trim();

    if (newJobTitle === (targetUser.jobTitle || '')) {
      setEditingJobTitleId(null);
      return;
    }

    setUpdatingId(targetUser.id);

    try {
      const result = await usersApi.updateUser(targetUser.id, {
        jobTitle: newJobTitle,
      });

      setUsers(prev =>
          prev.map(item =>
              item.id === targetUser.id
                  ? { ...item, jobTitle: newJobTitle }
                  : item,
          ),
      );

      showToast(
          'success',
          result.message || `Đã cập nhật chức danh của ${targetUser.fullName}.`,
      );

      setEditingJobTitleId(null);
    } catch (err: unknown) {
      showToast(
          'error',
          err instanceof Error
              ? err.message
              : 'Không thể cập nhật chức danh.',
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleStatusChange = async (
      targetUser: UserWithDept,
      isActive: boolean,
  ) => {
    const currentStatus = targetUser.isActive !== false;

    if (currentStatus === isActive) return;

    setUpdatingId(targetUser.id);

    try {
      const result = await usersApi.updateUser(targetUser.id, {
        isActive,
      });

      setUsers(prev =>
          prev.map(item =>
              item.id === targetUser.id
                  ? { ...item, isActive }
                  : item,
          ),
      );

      showToast(
          'success',
          result.message ||
          `Đã cập nhật trạng thái của ${targetUser.fullName}.`,
      );
    } catch (err: unknown) {
      showToast(
          'error',
          err instanceof Error
              ? err.message
              : 'Không thể cập nhật trạng thái.',
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleDeleteUser = async (targetUser: UserWithDept) => {
    const confirmed = window.confirm(
        `Bạn có chắc muốn xóa vĩnh viễn "${targetUser.fullName}"?\n\nHành động này không thể hoàn tác.`,
    );

    if (!confirmed) return;

    setUpdatingId(targetUser.id);

    try {
      const result = await usersApi.deleteUser(targetUser.id);

      setUsers(prev =>
          prev.filter(item => item.id !== targetUser.id),
      );

      showToast(
          'success',
          result.message ||
          `Đã xóa vĩnh viễn ${targetUser.fullName}.`,
      );
    } catch (err: unknown) {
      showToast(
          'error',
          err instanceof Error
              ? err.message
              : 'Không thể xóa người dùng.',
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleCreateDepartment = async () => {
    const name = departmentName.trim();
    const code = departmentCode.trim();

    if (!name || !code) {
      showToast('error', 'Vui lòng nhập tên và mã phòng ban.');
      return;
    }

    setCreatingDepartment(true);

    try {
      const result = await usersApi.createDepartment({
        name,
        code,
        description: departmentDescription.trim() || undefined,
      });

      setDepartments(prev =>
          [...prev, result.department].sort((a, b) =>
              a.name.localeCompare(b.name),
          ),
      );

      setDepartmentName('');
      setDepartmentCode('');
      setDepartmentDescription('');
      setShowDepartmentForm(false);

      showToast(
          'success',
          result.message || `Đã tạo phòng ban "${name}".`,
      );
    } catch (err: unknown) {
      showToast(
          'error',
          err instanceof Error
              ? err.message
              : 'Không thể tạo phòng ban.',
      );
    } finally {
      setCreatingDepartment(false);
    }
  };
  const resetCreateUserForm = () => {
    setNewUserForm({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      jobTitle: '',
      departmentId: '',
      role: 'EMPLOYEE',
    });
  };

  const handleCreateUser = async () => {
    const fullName = newUserForm.fullName.trim();
    const email = newUserForm.email.trim();
    const password = newUserForm.password;

    if (!fullName || !email || !password) {
      showToast(
          'error',
          'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.',
      );
      return;
    }

    if (password.length < 6) {
      showToast(
          'error',
          'Mật khẩu phải có ít nhất 6 ký tự.',
      );
      return;
    }

    if (
      newUserForm.role === 'EMPLOYEE' &&
      (!newUserForm.departmentId || !newUserForm.jobTitle.trim())
    ) {
      showToast(
          'error',
          'Vui lòng chọn phòng ban và nhập chức danh để AI có thể phân tích năng lực sơ bộ.',
      );
      return;
    }

    setCreatingUser(true);

    try {
      const result = await usersApi.createUser({
        fullName,
        email,
        password,
        phone: newUserForm.phone.trim() || undefined,
        jobTitle: newUserForm.jobTitle.trim() || undefined,
        departmentId: newUserForm.departmentId
            ? Number(newUserForm.departmentId)
            : undefined,
        role: newUserForm.role,
      });

      setUsers(prev =>
          [...prev, result.user as UserWithDept].sort(
              (a, b) => a.id - b.id,
          ),
      );

      resetCreateUserForm();
      setShowCreateUserModal(false);

      showToast(
          'success',
          result.message || `Đã tạo người dùng "${fullName}".`,
      );
    } catch (err: unknown) {
      showToast(
          'error',
          err instanceof Error
              ? err.message
              : 'Không thể tạo người dùng.',
      );
    } finally {
      setCreatingUser(false);
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
      {showCreateUserModal && (
          <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 px-4 py-6 backdrop-blur-[1px]"
              onMouseDown={() => {
                if (!creatingUser) {
                  setShowCreateUserModal(false);
                }
              }}
          >
            <div
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E2E5E7] bg-white shadow-[0_24px_80px_rgba(32,25,22,0.18)]"
                onMouseDown={event => event.stopPropagation()}
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-[#E8EAEC] px-6 py-5">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#1D2023]">
                    Tạo người dùng mới
                  </h3>

                  <p className="mt-1 text-xs text-[#687178]">
                    Tạo tài khoản và phân quyền truy cập hệ thống.
                  </p>
                </div>

                <button
                    type="button"
                    disabled={creatingUser}
                    onClick={() => setShowCreateUserModal(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl font-medium text-[#687178] transition hover:bg-[#F2F4F4] hover:text-[#303438] disabled:opacity-50"
                    aria-label="Đóng"
                >
                  ×
                </button>
              </div>

              {/* FORM */}
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                <label className="block">
          <span className="text-xs font-semibold text-[#565C61]">
            Họ và tên *
          </span>

                  <input
                      value={newUserForm.fullName}
                      onChange={event =>
                          setNewUserForm(prev => ({
                            ...prev,
                            fullName: event.target.value,
                          }))
                      }
                      placeholder="Nguyễn Văn A"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-sm text-[#303438] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                  />
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-[#565C61]">
            Email *
          </span>

                  <input
                      type="email"
                      value={newUserForm.email}
                      onChange={event =>
                          setNewUserForm(prev => ({
                            ...prev,
                            email: event.target.value,
                          }))
                      }
                      placeholder="name@company.com"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-sm text-[#303438] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                  />
                </label>

                <label className="block">
  <span className="text-xs font-semibold text-[#565C61]">
    Mật khẩu tạm *
  </span>

                  <div className="relative mt-2">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={newUserForm.password}
                        onChange={event =>
                            setNewUserForm(prev => ({
                              ...prev,
                              password: event.target.value,
                            }))
                        }
                        placeholder="Tối thiểu 6 ký tự"
                        className="h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] pl-3 pr-24 text-sm text-[#303438] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                    />

                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-[#6F3042] hover:bg-[#F4E7EB]"
                      >
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </button>

                      <button
                          type="button"
                          disabled={!newUserForm.password}
                          onClick={async () => {
                            await navigator.clipboard.writeText(newUserForm.password);
                            showToast('success', 'Đã sao chép mật khẩu tạm.');
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-[#6F3042] hover:bg-[#F4E7EB] disabled:opacity-40"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-[#565C61]">
            Số điện thoại
          </span>

                  <input
                      type="tel"
                      value={newUserForm.phone}
                      onChange={event =>
                          setNewUserForm(prev => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                      }
                      placeholder="0901234567"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-sm text-[#303438] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                  />
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-[#565C61]">
            Phòng ban {newUserForm.role === 'EMPLOYEE' ? '*' : ''}
          </span>

                  <select
                      value={newUserForm.departmentId}
                      onChange={event =>
                          setNewUserForm(prev => ({
                            ...prev,
                            departmentId: event.target.value,
                          }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-sm font-semibold text-[#52585D] outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10"
                  >
                    <option value="">Chưa phân phòng</option>

                    {departments.map(department => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                    ))}
                  </select>
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-[#565C61]">
            Chức danh {newUserForm.role === 'EMPLOYEE' ? '*' : ''}
          </span>

                  <input
                      value={newUserForm.jobTitle}
                      onChange={event =>
                          setNewUserForm(prev => ({
                            ...prev,
                            jobTitle: event.target.value,
                          }))
                      }
                      placeholder="Ví dụ: Kỹ sư phần mềm"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-sm text-[#303438] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                  />
                </label>

                <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-[#565C61]">
            Vai trò
          </span>

                  <select
                      value={newUserForm.role}
                      onChange={event =>
                          setNewUserForm(prev => ({
                            ...prev,
                            role: event.target.value as UserRole,
                          }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-3 text-sm font-semibold text-[#52585D] outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10"
                  >
                    {ALL_ROLES.map(role => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                    ))}
                  </select>
                </label>

              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-end gap-2 border-t border-[#E8EAEC] bg-[#FAFAFA] px-6 py-4">
                <button
                    type="button"
                    disabled={creatingUser}
                    onClick={() => {
                      resetCreateUserForm();
                      setShowCreateUserModal(false);
                    }}
                    className="h-10 rounded-xl border border-[#D8DCDE] bg-white px-5 text-xs font-semibold text-[#636A70] transition hover:bg-[#F2F4F4] disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                    type="button"
                    disabled={creatingUser}
                    onClick={handleCreateUser}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6F3042] px-5 text-xs font-semibold text-white transition hover:bg-[#5D2737] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingUser && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {creatingUser ? 'Đang tạo...' : 'Tạo người dùng'}
                </button>
              </div>
            </div>
          </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E2E5E7] bg-white">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1D2023]">
                Người dùng & Phân quyền
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[#687178]">Quản lý tài khoản, vai trò và phòng ban trong hệ thống.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDepartmentForm(prev => !prev)}
                className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#D8DCDE] bg-white px-4 text-sm font-semibold text-[#4D565E] transition hover:bg-[#F6F7F8]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />Thêm phòng ban
              </button>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#6F3042] px-4 text-sm font-semibold text-white transition hover:bg-[#5D2737]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />Tạo người dùng
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="relative h-11 min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#989FA4]" />
                <input
                  value={searchTerm}
                  aria-label="Tìm nhân sự theo tên, email hoặc phòng ban"
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Tìm tên, email, phòng ban..."
                  className="h-11 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] pl-10 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                />
              </div>

              <select
                value={roleFilter}
                aria-label="Lọc nhân sự theo vai trò"
                onChange={event =>
                  setRoleFilter(event.target.value as 'ALL' | UserRole)
                }
                className="h-11 rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] px-4 text-sm font-semibold text-[#52585D] outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10"
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D8DCDE] bg-white px-4 text-sm font-bold text-[#52585D] transition hover:bg-[#F2F4F4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới
              </button>
          </div>

          {/* FORM THÊM PHÒNG BAN */}
          {showDepartmentForm && (
              <div className="mt-5 rounded-2xl border border-[#E2E5E7] bg-[#F8F9F9] p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block min-w-0 text-sm font-medium text-[#4D565E]">
                    Tên phòng ban
                    <input
                      value={departmentName}
                      onChange={event => setDepartmentName(event.target.value)}
                      placeholder="Tên phòng ban"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-white px-3 text-sm outline-none focus:border-[#8A4153]"
                  />
                  </label>

                  <label className="block min-w-0 text-sm font-medium text-[#4D565E]">
                    Mã phòng ban
                    <input
                      value={departmentCode}
                      onChange={event => setDepartmentCode(event.target.value)}
                      placeholder="Mã phòng ban, ví dụ: IT"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-white px-3 text-sm outline-none focus:border-[#8A4153]"
                  />
                  </label>

                  <label className="block min-w-0 text-sm font-medium text-[#4D565E]">
                    Mô tả <span className="font-normal text-[#687178]">(tùy chọn)</span>
                    <input
                      value={departmentDescription}
                      onChange={event => setDepartmentDescription(event.target.value)}
                      placeholder="Mô tả (không bắt buộc)"
                      className="mt-2 h-11 w-full rounded-xl border border-[#D8DCDE] bg-white px-3 text-sm outline-none focus:border-[#8A4153]"
                  />
                  </label>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                      type="button"
                      onClick={() => setShowDepartmentForm(false)}
                      disabled={creatingDepartment}
                      className="h-10 rounded-xl border border-[#D8DCDE] bg-white px-4 text-xs font-bold text-[#636A70]"
                  >
                    Hủy
                  </button>

                  <button
                      type="button"
                      onClick={handleCreateDepartment}
                      disabled={creatingDepartment}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6F3042] px-4 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {creatingDepartment && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}

                    {creatingDepartment ? 'Đang tạo...' : 'Tạo phòng ban'}
                  </button>
                </div>
              </div>
          )}

          {/* THỐNG KÊ + BỘ LỌC VAI TRÒ */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
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
                            : 'border-[#E2E5E7] bg-white text-[#687178] hover:bg-[#F8F9F9]'
                    }`}
                >
                  {ROLE_LABELS[role]} · {roleCounts[role] || 0}
                </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex min-h-80 items-center justify-center gap-3 text-[#687178]">
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
                  className="mt-3 text-xs font-semibold text-[#6F3042] underline underline-offset-4"
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
            <p className="mt-3 text-sm font-semibold text-[#303438]">
              Không có kết quả phù hợp
            </p>
            <p className="mt-1 text-xs text-[#687178]">
              Thử đổi từ khóa hoặc bộ lọc vai trò.
            </p>
          </div>
        )}

        {!loading && !error && filteredUsers.length > 0 && (
          <div className="tv4-table-scroll overflow-x-auto" role="region" aria-label="Danh sách nhân sự" tabIndex={0}>
            <table className="tv4-admin-table w-full min-w-[1040px] table-fixed">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>

              <thead>
              <tr className="border-b border-[#E8EAEC] bg-[#F8F9F9]">
                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Nhân sự
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Phòng ban
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Chức danh
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Vai trò
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Trạng thái
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Quyền truy cập
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#687178] sm:px-7">
                  Thao tác
                </th>
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#202326] text-xs font-semibold text-white shadow-sm">
                            {getInitials(item.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="break-words text-sm font-semibold text-[#27211E]">
                                {item.fullName}
                              </p>
                              {isSelf && (
                                <span className="rounded-full bg-[#EFF1F2] px-2 py-0.5 text-xs font-bold text-[#687178]">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p title={item.email} className="mt-0.5 truncate text-xs text-[#687178]">
                              {item.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <select
                            value={item.department?.id ?? ''}
                            disabled={!canEdit || isUpdating}
                            onChange={event =>
                                handleDepartmentChange(
                                    item,
                                    Number(event.target.value),
                                )
                            }
                            className="h-10 w-full min-w-0 rounded-lg border border-[#D8DCDE] bg-white px-2 text-xs font-medium text-[#53595E] outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="" disabled>
                            Chưa phân phòng
                          </option>

                          {departments.map(department => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        {editingJobTitleId === item.id ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <input
                                  value={jobTitleDraft}
                                  onChange={event => setJobTitleDraft(event.target.value)}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                      handleSaveJobTitle(item);
                                    }

                                    if (event.key === 'Escape') {
                                      setEditingJobTitleId(null);
                                    }
                                  }}
                                  autoFocus
                                  className="h-9 w-full rounded-xl border border-[#D8DCDE] bg-white px-3 text-xs font-semibold text-[#53595E] outline-none focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10"
                              />

                              <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleSaveJobTitle(item)}
                                  className="h-9 rounded-xl bg-[#6F3042] px-3 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Lưu
                              </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={!canEdit}
                                onClick={() => {
                                  setEditingJobTitleId(item.id);
                                  setJobTitleDraft(item.jobTitle || '');
                                }}
                                className="inline-flex items-center gap-2 whitespace-nowrap text-left text-xs font-semibold text-[#636A70] disabled:cursor-not-allowed disabled:opacity-60"                            >
                              <BriefcaseBusiness className="h-3.5 w-3.5 text-[#9DA4A9]" />
                              {item.jobTitle || 'Chưa cập nhật'}
                            </button>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 sm:px-7">
                        <Badge
                            variant={ROLE_BADGE_VARIANT[item.role]}
                            size="sm"
                        >
                          {ROLE_LABELS[item.role]}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        <select
                            value={item.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                            disabled={!canEdit || isUpdating}
                            onChange={event =>
                                handleStatusChange(
                                    item,
                                    event.target.value === 'ACTIVE',
                                )
                            }
                            className={`h-9 rounded-xl border px-3 text-xs font-bold outline-none transition focus:border-[#8A4153] focus:ring-4 focus:ring-[#8A4153]/10 disabled:cursor-not-allowed disabled:opacity-50 ${
                                item.isActive === false
                                    ? 'border-[#D8DCDE] bg-[#ECEEEE] text-[#7C746D]'
                                    : 'border-[#CDE3D6] bg-[#EFF7F1] text-[#2F6B4F]'
                            }`}
                        >
                          <option value="ACTIVE">Hoạt động</option>
                          <option value="INACTIVE">Tạm khóa</option>
                        </select>
                      </td>

                      <td className="px-5 py-4 sm:px-7">
                        {isRootAdmin ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687178]">
                            <Lock className="h-3.5 w-3.5" />
                            Tài khoản gốc
                          </span>
                        ) : isSelf ? (
                          <span className="text-xs font-semibold text-[#687178]">
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
                      <td className="px-5 py-4 sm:px-7">
                        {isRootAdmin ? (
                            <span />
                        ) : isSelf ? (
                            <span className="text-xs font-semibold text-[#687178]">
      Tài khoản hiện tại
    </span>
                        ) : (
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleDeleteUser(item)}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#EDC7CC] bg-[#FBF1F2] px-3 text-xs font-semibold text-[#9D4150] transition hover:bg-[#F7E4E7] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Xóa
                            </button>
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
  crashTesting: boolean;
  crashTestMessage: string;
  crashTestSuccess: boolean | null;
  onGeminiKeyChange: (value: string) => void;
  onN8nUrlChange: (value: string) => void;
  onTestGemini: () => void;
  onTestN8n: () => void;
  onTestCrash: () => void;
  onSave: () => void;
}> = props => {
  const geminiKeyIsUrl = /^https?:\/\//i.test(props.geminiApiKey.trim());
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2E5E7] bg-white">
      <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-xl font-bold tracking-tight text-[#1D2023]">
          Tích hợp
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
                <h3 className="text-sm font-semibold text-[#202326]">Gemini AI</h3>
                <p className="mt-0.5 text-sm text-[#687178]">Dịch vụ phân tích và tổng hợp nội dung</p>
              </div>
            </div>
            {props.geminiTestSuccess === true && (
              <span className="rounded-full bg-[#EFF7F1] px-2.5 py-1 text-xs font-bold text-[#2F6B4F]">
                Đã kết nối
              </span>
            )}
          </div>

          <label htmlFor="gemini-api-key" className="mt-6 block text-sm font-semibold text-[#596167]">
            Khóa API Gemini
          </label>
          <div className="relative mt-2">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687178]" />
            <input
              id="gemini-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={geminiKeyIsUrl ? 'gemini-api-key-help' : undefined}
              aria-invalid={geminiKeyIsUrl || undefined}
              value={props.geminiApiKey}
              onChange={event => props.onGeminiKeyChange(event.target.value)}
              placeholder="Dán giá trị khóa API Gemini"
              className="h-12 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] pl-10 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
            />
          </div>

          {geminiKeyIsUrl && (
            <p id="gemini-api-key-help" role="alert" className="mt-2 text-sm leading-6 text-[#9D4150]">
              Bạn đang nhập địa chỉ website. Hãy dán giá trị khóa API Gemini vào ô này.
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={props.onTestGemini}
              disabled={props.geminiTesting}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D3D8DA] bg-white px-4 text-xs font-semibold text-[#666D72] transition hover:bg-[#F2F4F4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.geminiTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {props.geminiTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
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
                <h3 className="text-sm font-semibold text-[#202326]">n8n</h3>
                <p className="mt-0.5 text-sm text-[#687178]">Điều phối các quy trình tự động</p>
              </div>
            </div>
            {props.n8nTestSuccess === true && (
              <span className="rounded-full bg-[#EFF7F1] px-2.5 py-1 text-xs font-bold text-[#2F6B4F]">
                Đã kết nối
              </span>
            )}
          </div>

          <label htmlFor="tv4-n8n-webhook" className="mt-6 block text-sm font-semibold text-[#596167]">
            Địa chỉ webhook
          </label>
          <div className="relative mt-2">
            <Workflow className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687178]" />
            <input
              id="tv4-n8n-webhook"
              type="text"
              value={props.n8nWebhookUrl}
              onChange={event => props.onN8nUrlChange(event.target.value)}
              placeholder="http://localhost:5678/webhook/..."
              className="h-12 w-full rounded-xl border border-[#D8DCDE] bg-[#F8F9F9] pl-10 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={props.onTestCrash}
              disabled={props.crashTesting}
              title="Kích hoạt sự cố 500 để demo WF-03 AI Debugger"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#F0D5D8] bg-[#FFF5F6] px-3.5 text-xs font-semibold text-[#A82D3B] transition hover:bg-[#FDE8EA] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.crashTesting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#A82D3B]" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-[#A82D3B]" />
              )}
              {props.crashTesting ? 'Đang kích hoạt...' : '🚨 Mô phỏng sự cố 500 (AI Debugger)'}
            </button>

            <button
              type="button"
              onClick={props.onTestN8n}
              disabled={props.n8nTesting || !props.n8nWebhookUrl.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D3D8DA] bg-white px-4 text-xs font-semibold text-[#666D72] transition hover:bg-[#F2F4F4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.n8nTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {props.n8nTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
          </div>

          <ConnectionStatus
            success={props.n8nTestSuccess}
            text={props.n8nTestMessage}
          />
          <ConnectionStatus
            success={props.crashTestSuccess}
            text={props.crashTestMessage}
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
                : 'text-[#687178]'
          }`}
        >
          {props.configMessage || ' '}
        </p>

        <button
          type="button"
          onClick={props.onSave}
          disabled={props.configSaving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6F3042] px-5 text-sm font-semibold text-white transition hover:bg-[#5D2737] disabled:cursor-not-allowed disabled:opacity-50"
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
  const [hrWorkspaceTab, setHrWorkspaceTab] =
    useState<'rag' | 'courses'>('courses');
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

  const [crashTesting, setCrashTesting] = useState(false);
  const [crashTestMessage, setCrashTestMessage] = useState('');
  const [crashTestSuccess, setCrashTestSuccess] =
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
    if (/^https?:\/\//i.test(geminiApiKey.trim())) {
      setConfigMessage('Ô khóa API Gemini đang chứa địa chỉ website. Hãy thay bằng giá trị khóa API rồi lưu lại.');
      return;
    }
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
      setConfigMessage(error instanceof Error ? error.message : 'Lưu cấu hình thất bại.');
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
      setGeminiTestSuccess(result.success);
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

  const handleTestCrash = async () => {
    try {
      setCrashTesting(true);
      setCrashTestSuccess(null);
      setCrashTestMessage('Đang kích hoạt sự cố 500...');
      await systemConfigApi.testCrash();
    } catch {
      setCrashTestSuccess(true);
      setCrashTestMessage(
        '✅ Đã kích hoạt sự cố 500 thành công! Backend đã ném lỗi sang n8n WF-03, vui lòng kiểm tra Telegram & Email.',
      );
    } finally {
      setCrashTesting(false);
    }
  };

  if (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') {
    return (
      <div className="min-h-full bg-[#F4F5F5] px-4 py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E1E4E5] bg-white p-8 text-center shadow-[0_20px_60px_rgba(63,48,40,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F6E9ED] text-[#6F3042]">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#1D2023]">
            Không có quyền truy cập
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#687178]">
            Khu vực quản trị chỉ dành cho SuperAdmin hoặc HR.
          </p>
        </div>
      </div>
    );
  }

  if (user?.role === 'HR') {
    return (
      <div className="tv4-ui min-h-full bg-[#F7F8FA]">
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-2xl border border-[#E1E4E5] bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-2xl font-bold tracking-tight text-[#1D2023]">
                  Tri thức & Phát triển
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#687178]">
                  Quản lý nguồn tri thức và lộ trình đào tạo trong một không gian thống nhất.
                </p>
              </div>

              <div className="grid gap-2 rounded-xl border border-[#E2E5E7] bg-[#F6F7F7] p-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setHrWorkspaceTab('courses')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    hrWorkspaceTab === 'courses'
                      ? 'bg-white text-[#2B2421] shadow-sm'
                      : 'text-[#777E83] hover:bg-white/70'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  Đào tạo & Phát triển
                </button>
                <button
                  type="button"
                  onClick={() => setHrWorkspaceTab('rag')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    hrWorkspaceTab === 'rag'
                      ? 'bg-white text-[#2B2421] shadow-sm'
                      : 'text-[#777E83] hover:bg-white/70'
                  }`}
                >
                  <Database className="h-4 w-4" />
                  Kho tri thức
                </button>
              </div>
            </div>
          </div>

          {hrWorkspaceTab === 'courses' ? (
            <TrainingPanel />
          ) : (
            <KnowledgeBasePanel />
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="tv4-ui min-h-full bg-[#F7F8FA]">
      <div className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="grid items-start gap-6 lg:grid-cols-[212px_minmax(0,1fr)] xl:gap-7">
          <aside className="h-fit rounded-2xl border border-[#E1E4E5] bg-white p-2 lg:sticky lg:top-6">
            <nav className="grid grid-cols-2 gap-1 lg:block lg:space-y-1" aria-label="Các mục cài đặt hệ thống">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`tv4-nav-item relative flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left transition ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#2B2421]'
                        : 'text-[#687178] hover:bg-white/70 hover:text-[#303438]'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${
                        isActive
                          ? 'bg-[#F4E7EB] text-[#6F3042]'
                          : 'bg-transparent text-[#687178]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold leading-5 sm:text-sm">{item.label}</span>
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
                crashTesting={crashTesting}
                crashTestMessage={crashTestMessage}
                crashTestSuccess={crashTestSuccess}
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
                onTestCrash={handleTestCrash}
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
