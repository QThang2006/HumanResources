import type { User, UserRole } from '../types';

export interface ManagedUser extends User {
  department?: { id: number; name: string; description?: string };
  isActive?: boolean;
  phone?: string;
  joinedDate?: string;
}
export interface UserDepartment { id: number; name: string; code?: string; description?: string }
export interface UserAccountUpdate { departmentId?: number; jobTitle?: string; role?: UserRole; isActive?: boolean }
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'Super Admin', HR: 'HR', MANAGER: 'Manager', EMPLOYEE: 'Employee',
};
export const USER_ROLE_HELP: Record<UserRole, string> = {
  SUPERADMIN: 'Quản trị hệ thống, quản lý tài khoản và cấp vai trò. Tài khoản quản trị gốc được bảo vệ.',
  HR: 'Vai trò nhân sự, sử dụng các chức năng tuyển dụng và đào tạo được hệ thống cấp phép. Không được cấp quyền tài khoản.',
  MANAGER: 'Vai trò quản lý, sử dụng các chức năng dành cho quản lý theo phạm vi dữ liệu của từng phân hệ.',
  EMPLOYEE: 'Vai trò nhân viên, sử dụng không gian làm việc và các chức năng cá nhân được cấp phép.',
};
export const USER_ROLE_BADGES = { SUPERADMIN: 'danger', HR: 'purple', MANAGER: 'warning', EMPLOYEE: 'default' } as const;
export const userInitials = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join('').toUpperCase() || 'U';
export const userDepartmentName = (user: ManagedUser) => user.department?.name || user.departmentName || 'Chưa phân phòng';
