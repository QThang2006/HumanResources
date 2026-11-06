import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

export interface UserAccountUpdate {
  departmentId?: number;
  jobTitle?: string;
  role?: UserRole;
  isActive?: boolean;
}

export function validateUserAccountUpdate(input: unknown): asserts input is UserAccountUpdate {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Dữ liệu cập nhật tài khoản không hợp lệ.');
  const data = input as Record<string, unknown>;
  const fields = Object.keys(data);
  if (!fields.length || fields.some(field => !['departmentId', 'jobTitle', 'role', 'isActive'].includes(field))) throw new BadRequestException('Chỉ được cập nhật phòng ban, chức danh, vai trò và trạng thái tài khoản.');
  if ('departmentId' in data && (!Number.isSafeInteger(data.departmentId) || Number(data.departmentId) < 1)) throw new BadRequestException('Mã phòng ban không hợp lệ.');
  if ('jobTitle' in data && (typeof data.jobTitle !== 'string' || data.jobTitle.trim().length > 100)) throw new BadRequestException('Chức danh phải là văn bản, tối đa 100 ký tự.');
  if ('role' in data && !Object.values(UserRole).includes(data.role as UserRole)) throw new BadRequestException('Vai trò hệ thống không hợp lệ.');
  if ('isActive' in data && typeof data.isActive !== 'boolean') throw new BadRequestException('Trạng thái tài khoản phải là true hoặc false.');
}
