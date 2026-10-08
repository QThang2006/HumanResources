import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { User, UserRole } from '../../entities/user.entity';
import { ApplicationStatus } from '../../entities/application.entity';

export type Actor = Pick<User, 'id' | 'role' | 'departmentId'>;
export function assertOperator(actor: Actor) {
  if (![UserRole.HR, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Chỉ HR hoặc quản trị viên được thực hiện thao tác này.');
}
export function assertScope(actor: Actor, departmentId: number) {
  if (actor.role === UserRole.MANAGER) {
    if (!actor.departmentId || actor.departmentId !== departmentId) throw new NotFoundException('Không tìm thấy dữ liệu trong phạm vi của bạn.');
  } else assertOperator(actor);
}
export function assertStatusTransition(from: ApplicationStatus, to: ApplicationStatus) {
  const allowed: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
    APPLIED: [ApplicationStatus.REJECTED],
    INTERVIEWING: [ApplicationStatus.REJECTED, ApplicationStatus.OFFERED],
    OFFERED: [ApplicationStatus.REJECTED],
  };
  if (!allowed[from]?.includes(to)) throw new ConflictException('Chuyển trạng thái không hợp lệ. Phỏng vấn và nhận việc cần dùng thao tác riêng.');
}
export function assertFresh(actual: Date, expected: string) {
  if (actual.getTime() !== new Date(expected).getTime()) throw new ConflictException('Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu.');
}
// Keep revisions monotonic even on databases configured with second precision.
export function nextRevision(actual: Date) {
  return new Date(Math.max(Math.floor(Date.now() / 1000) * 1000, actual.getTime() + 1000));
}
