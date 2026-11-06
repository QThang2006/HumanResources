import { ChevronRight } from 'lucide-react';
import { Badge } from './common';
import { USER_ROLE_BADGES, USER_ROLE_LABELS, userDepartmentName, userInitials, type ManagedUser } from './user-management';

export function UsersListTable({ users, currentUserId, onOpen }: { users: ManagedUser[]; currentUserId: number; onOpen: (user: ManagedUser) => void }) {
  return <div className="tv4-users-list" role="region" aria-label="Danh sách người dùng">
    <table>
      <caption className="sr-only">Danh sách tài khoản. Chọn tên hoặc Xem chi tiết để chỉnh sửa.</caption>
      <thead><tr><th>Nhân sự</th><th>Phòng ban</th><th>Chức danh</th><th>Vai trò</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
      <tbody>{users.map(user => <tr key={user.id}>
        <td data-label="Nhân sự"><button type="button" className="tv4-user-name" onClick={() => onOpen(user)} aria-label={`Xem người dùng ${user.fullName}`}><span className="tv4-user-avatar">{userInitials(user.fullName)}</span><span><span className="tv4-user-name-line"><strong>{user.fullName}</strong>{user.id === currentUserId && <span className="tv4-user-self">Bạn</span>}</span><span className="tv4-user-email">{user.email}</span></span></button></td>
        <td data-label="Phòng ban">{userDepartmentName(user)}</td>
        <td data-label="Chức danh">{user.jobTitle || <span className="tv4-user-help">Chưa cập nhật</span>}</td>
        <td data-label="Vai trò"><Badge variant={USER_ROLE_BADGES[user.role]}>{USER_ROLE_LABELS[user.role]}</Badge></td>
        <td data-label="Trạng thái"><Badge variant={user.isActive === false ? 'default' : 'success'}>{user.isActive === false ? 'Đã vô hiệu hóa' : 'Hoạt động'}</Badge></td>
        <td><button type="button" className="tv4-user-detail-button" onClick={() => onOpen(user)} aria-label={`Chi tiết tài khoản ${user.fullName}`}>Chi tiết<ChevronRight size={16} aria-hidden="true" /></button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
