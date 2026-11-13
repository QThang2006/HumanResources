import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Plus, RefreshCw, Search, Users } from 'lucide-react';
import { usersApi } from '../api/users.api';
import type { UserRole } from '../types';
import { TrainingToast } from './TrainingToast';
import { UserDetailsDrawer } from './UserDetailsDrawer';
import { UsersListTable } from './UsersListTable';
import { USER_ROLE_LABELS as ROLE_LABELS, userDepartmentName as getDeptName } from './user-management';
import type { ManagedUser as UserWithDept, UserDepartment as DepartmentOption, UserAccountUpdate } from './user-management';
import './user-management.css';
const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
const ASSIGNABLE_ROLES: UserRole[] = ['HR', 'MANAGER', 'EMPLOYEE'];

export const UserManagementPanel: React.FC<{ currentUserId: number }> = ({ currentUserId }) => {
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
  const [selectedUser, setSelectedUser] = useState<UserWithDept | null>(null);
  const [detailError, setDetailError] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [toast, setToast] = useState<{ id: number; type: 'success' | 'error'; message: string } | null>(null);
  const toastSequence = useRef(0);
  const showToast = (type: 'success' | 'error', message: string) => setToast({ id: ++toastSequence.current, type, message });
  const toastId = toast?.id;
  const dismissToast = useCallback(() => setToast(current => current?.id === toastId ? null : current), [toastId]);

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

  const handleSaveUser = async (data: UserAccountUpdate) => {
    if (!selectedUser || updatingId !== null) return;
    const target = selectedUser;
    setUpdatingId(target.id);
    setDetailError('');
    try {
      const result = await usersApi.updateUser(target.id, data);
      const department = departments.find(item => item.id === data.departmentId);
      setUsers(prev => prev.map(item => item.id === target.id ? {
        ...item, ...data, ...(department ? { department } : {}),
      } : item));
      setSelectedUser(null);
      showToast('success', result.message || `Đã cập nhật tài khoản ${target.fullName}.`);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Không thể cập nhật. Vui lòng thử lại.');
    } finally { setUpdatingId(null); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || updatingId !== null) return;
    const target = selectedUser;
    setUpdatingId(target.id);
    setDetailError('');
    try {
      const result = await usersApi.deleteUser(target.id);
      setUsers(prev => prev.filter(item => item.id !== target.id));
      setSelectedUser(null);
      showToast('success', result.message || `Đã xóa tài khoản ${target.fullName}.`);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Không thể xóa tài khoản. Vui lòng thử lại.');
    } finally { setUpdatingId(null); }
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

      return matchesRole
        && (departmentFilter === 'ALL' || String(item.department?.id ?? item.departmentId ?? '') === departmentFilter)
        && (statusFilter === 'ALL' || (item.isActive === false ? 'INACTIVE' : 'ACTIVE') === statusFilter)
        && (!keyword || searchable.includes(keyword));
    }).sort((a, b) =>
      ALL_ROLES.indexOf(a.role) - ALL_ROLES.indexOf(b.role) || a.id - b.id,
    );
  }, [roleFilter, departmentFilter, statusFilter, searchTerm, users]);

  return (
    <div className="tv4-ui tv4-users-management space-y-5">
      {toast && <TrainingToast key={toast.id} message={toast.message} success={toast.type === 'success'} error={toast.type === 'error'} onClose={dismissToast} />}
      {selectedUser && <UserDetailsDrawer key={selectedUser.id} user={selectedUser} currentUserId={currentUserId} departments={departments} busy={updatingId !== null} error={detailError} onSave={handleSaveUser} onDelete={handleDeleteUser} onClose={() => { setSelectedUser(null); setDetailError(''); }} />}
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
                className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                onMouseDown={event => event.stopPropagation()}
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    Tạo người dùng mới
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Tạo tài khoản và phân quyền truy cập hệ thống.
                  </p>
                </div>

                <button
                    type="button"
                    disabled={creatingUser}
                    onClick={() => setShowCreateUserModal(false)}
                    className="flex h-10 w-9 items-center justify-center rounded-lg text-xl font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                    aria-label="Đóng"
                >
                  ×
                </button>
              </div>

              {/* FORM */}
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                <label className="block">
          <span className="text-xs font-semibold text-slate-700">
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                  />
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-slate-700">
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                  />
                </label>

                <label className="block">
  <span className="text-xs font-semibold text-slate-700">
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
                        className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-3 pr-24 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                    />

                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-primary-600 hover:bg-primary-50"
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
                          className="rounded-lg px-2 py-1 text-xs font-bold text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-slate-700">
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                  />
                </label>

                <label className="block">
          <span className="text-xs font-semibold text-slate-700">
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10"
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
          <span className="text-xs font-semibold text-slate-700">
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                  />
                </label>

                <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-700">
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10"
                  >
                    {ASSIGNABLE_ROLES.map(role => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                    ))}
                  </select>
                </label>

              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                    type="button"
                    disabled={creatingUser}
                    onClick={() => {
                      resetCreateUserForm();
                      setShowCreateUserModal(false);
                    }}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                    type="button"
                    disabled={creatingUser}
                    onClick={handleCreateUser}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Người dùng & Phân quyền
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">Quản lý tài khoản, vai trò và phòng ban trong hệ thống.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDepartmentForm(prev => !prev)}
                className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />Thêm phòng ban
              </button>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />Tạo người dùng
              </button>
            </div>
          </div>

          <div className="tv4-user-filters">
              <div className="relative h-11 min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  aria-label="Tìm nhân sự theo tên, email hoặc phòng ban"
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Tìm tên, email, phòng ban..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                />
              </div>

              <select
                value={roleFilter}
                aria-label="Lọc nhân sự theo vai trò"
                onChange={event =>
                  setRoleFilter(event.target.value as 'ALL' | UserRole)
                }
                className="h-10 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10"
              >
                <option value="ALL">Tất cả vai trò</option>
                {ALL_ROLES.map(role => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>

              <select aria-label="Lọc theo phòng ban" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)}>
                <option value="ALL">Tất cả phòng ban</option><option value="">Chưa phân phòng</option>
                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
              <select aria-label="Lọc theo trạng thái tài khoản" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Đã vô hiệu hóa</option>
              </select>
              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới
              </button>
          </div>

          {/* FORM THÊM PHÒNG BAN */}
          {showDepartmentForm && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block min-w-0 text-sm font-medium text-slate-700">
                    Tên phòng ban
                    <input
                      value={departmentName}
                      onChange={event => setDepartmentName(event.target.value)}
                      placeholder="Tên phòng ban"
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-600"
                  />
                  </label>

                  <label className="block min-w-0 text-sm font-medium text-slate-700">
                    Mã phòng ban
                    <input
                      value={departmentCode}
                      onChange={event => setDepartmentCode(event.target.value)}
                      placeholder="Mã phòng ban, ví dụ: IT"
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-600"
                  />
                  </label>

                  <label className="block min-w-0 text-sm font-medium text-slate-700">
                    Mô tả <span className="font-normal text-slate-600">(tùy chọn)</span>
                    <input
                      value={departmentDescription}
                      onChange={event => setDepartmentDescription(event.target.value)}
                      placeholder="Mô tả (không bắt buộc)"
                      className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-600"
                  />
                  </label>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                      type="button"
                      onClick={() => setShowDepartmentForm(false)}
                      disabled={creatingDepartment}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600"
                  >
                    Hủy
                  </button>

                  <button
                      type="button"
                      onClick={handleCreateDepartment}
                      disabled={creatingDepartment}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
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
            <div className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white">
              {users.length} tài khoản
            </div>

            {ALL_ROLES.map(role => (
                <button
                    key={role}
                    type="button"
                    aria-pressed={roleFilter === role}
                    onClick={() => setRoleFilter(previous => previous === role ? 'ALL' : role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        roleFilter === role
                            ? 'border-primary-600 bg-primary-50 text-primary-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {ROLE_LABELS[role]} · {roleCounts[role] || 0}
                </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex min-h-80 items-center justify-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-semibold">Đang tải dữ liệu...</span>
          </div>
        )}

        {error && !loading && (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:m-7">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
              <div>
                <p className="text-sm font-bold text-rose-700">
                  Không thể tải danh sách nhân sự
                </p>
                <p className="mt-1 text-xs text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="mt-3 text-xs font-semibold text-primary-600 underline underline-offset-4"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Không có kết quả phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Thử đổi từ khóa hoặc các bộ lọc.
            </p>
          </div>
        )}

        {!loading && !error && <div className="tv4-user-results"><span>{filteredUsers.length} / {users.length} tài khoản</span>{(searchTerm || roleFilter !== 'ALL' || departmentFilter !== 'ALL' || statusFilter !== 'ALL') && <button type="button" onClick={() => { setSearchTerm(''); setRoleFilter('ALL'); setDepartmentFilter('ALL'); setStatusFilter('ALL'); }}>Xóa bộ lọc</button>}</div>}
        {!loading && !error && filteredUsers.length > 0 && <UsersListTable users={filteredUsers} currentUserId={currentUserId} onOpen={item => { setDetailError(''); setSelectedUser(item); }} />}

      </section>
    </div>
  );
};
