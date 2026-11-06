import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Lock, ShieldCheck, Trash2, X } from 'lucide-react';
import { Badge } from './common';
import { USER_ROLE_BADGES, USER_ROLE_HELP, USER_ROLE_LABELS, userDepartmentName, userInitials } from './user-management';
import type { ManagedUser, UserAccountUpdate, UserDepartment } from './user-management';
import type { UserRole } from '../types';
import './user-management.css';

interface Props {
  user: ManagedUser;
  currentUserId: number;
  departments: UserDepartment[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (data: UserAccountUpdate) => void;
  onDelete: () => void;
}

export function UserDetailsDrawer({ user, currentUserId, departments, busy, error, onClose, onSave, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [departmentId, setDepartmentId] = useState(String(user.department?.id ?? user.departmentId ?? ''));
  const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive !== false);
  const [step, setStep] = useState<'edit' | 'confirm' | 'delete' | 'discard'>('edit');
  const [deleteName, setDeleteName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [tab, setTab] = useState<'profile' | 'access'>('profile');
  const readOnly = user.id === 1 || user.id === currentUserId;
  const changes: UserAccountUpdate = {};
  if (departmentId !== String(user.department?.id ?? user.departmentId ?? '')) changes.departmentId = Number(departmentId);
  if (jobTitle.trim() !== (user.jobTitle || '')) changes.jobTitle = jobTitle.trim();
  if (role !== user.role) changes.role = role;
  if (isActive !== (user.isActive !== false)) changes.isActive = isActive;
  const dirty = Object.keys(changes).length > 0;

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (step !== 'edit') document.getElementById('user-action-title')?.focus();
  }, [step]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const requestClose = () => { if (!busy) { if (dirty) setStep('discard'); else onClose(); } };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || readOnly || !dirty) return;
    if (changes.departmentId !== undefined && !departments.some(dept => dept.id === changes.departmentId)) return setValidationError('Vui lòng chọn phòng ban hợp lệ.');
    if (jobTitle.trim().length > 100) return setValidationError('Chức danh không được vượt quá 100 ký tự.');
    setValidationError('');
    if (changes.role !== undefined || changes.isActive !== undefined) setStep('confirm');
    else onSave(changes);
  };

  return <dialog ref={dialogRef} className="tv4-ui tv4-user-drawer" aria-labelledby="user-detail-title"
    onCancel={event => { event.preventDefault(); requestClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) requestClose();
    }}>
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <header className="tv4-user-drawer-header">
        <h3 id="user-detail-title">Chi tiết người dùng</h3>
        <button type="button" className="tv4-user-icon-button" aria-label="Đóng chi tiết người dùng" disabled={busy} onClick={requestClose}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="tv4-user-drawer-body">
        <div className="tv4-user-identity"><span className="tv4-user-avatar">{userInitials(user.fullName)}</span><div><h4>{user.fullName}</h4><p>{user.email}</p></div></div>
        <div className="tv4-user-badges"><Badge variant={USER_ROLE_BADGES[user.role]}>{USER_ROLE_LABELS[user.role]}</Badge><Badge variant={user.isActive === false ? 'default' : 'success'}>{user.isActive === false ? 'Đã vô hiệu hóa' : 'Hoạt động'}</Badge></div>
        {readOnly && <p className="tv4-user-note"><Lock size={16} aria-hidden="true" />{user.id === 1 ? 'Tài khoản quản trị gốc được bảo vệ. Thông tin chỉ để xem.' : 'Đây là tài khoản đang đăng nhập. Không thể tự thay đổi quyền hoặc vô hiệu hóa tại đây.'}</p>}
        {step === 'edit' && <>
          <div className="tv4-user-tabs" role="tablist" aria-label="Chi tiết tài khoản" onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 'profile' : event.key === 'End' ? 'access' : tab === 'profile' ? 'access' : 'profile';
            setTab(next);
            document.getElementById(next === 'profile' ? 'user-profile-tab' : 'user-access-tab')?.focus();
          }}>
            <button type="button" role="tab" id="user-profile-tab" aria-controls="user-detail-panel" aria-selected={tab === 'profile'} tabIndex={tab === 'profile' ? 0 : -1} onClick={() => setTab('profile')}>Thông tin nhân sự</button>
            <button type="button" role="tab" id="user-access-tab" aria-controls="user-detail-panel" aria-selected={tab === 'access'} tabIndex={tab === 'access' ? 0 : -1} onClick={() => setTab('access')}>Tài khoản & quyền</button>
          </div>
          <div role="tabpanel" id="user-detail-panel" aria-labelledby={tab === 'profile' ? 'user-profile-tab' : 'user-access-tab'}>
            {tab === 'profile' ? <div className="tv4-user-fields">
              <label>Phòng ban<select disabled={readOnly || busy} value={departmentId} onChange={event => setDepartmentId(event.target.value)}><option value="" disabled>Chưa phân phòng</option>{departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select></label>
              <label>Chức danh<input disabled={readOnly || busy} maxLength={100} value={jobTitle} onChange={event => setJobTitle(event.target.value)} placeholder="Nhập chức danh" /></label>
              <p className="tv4-user-help">Phòng ban và chức danh mô tả vị trí công việc, không tự cấp quyền truy cập.</p>
              <dl className="tv4-user-facts"><div><dt>Họ và tên</dt><dd>{user.fullName}</dd></div><div><dt>Email đăng nhập</dt><dd>{user.email}</dd></div>{user.phone && <div><dt>Điện thoại</dt><dd>{user.phone}</dd></div>}</dl>
            </div> : <div className="tv4-user-fields">
              <label>Vai trò hệ thống<select disabled={readOnly || busy} value={role} onChange={event => setRole(event.target.value as UserRole)} aria-describedby="user-role-help">{(user.role === 'SUPERADMIN' ? ['SUPERADMIN'] as UserRole[] : ['HR', 'MANAGER', 'EMPLOYEE'] as UserRole[]).map(value => <option key={value} value={value}>{USER_ROLE_LABELS[value]}</option>)}</select></label>
              <p id="user-role-help" className="tv4-user-note"><ShieldCheck size={18} aria-hidden="true" />{USER_ROLE_HELP[role]}</p>
              <label>Trạng thái tài khoản<select disabled={readOnly || busy} value={isActive ? 'ACTIVE' : 'INACTIVE'} onChange={event => setIsActive(event.target.value === 'ACTIVE')}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Vô hiệu hóa</option></select></label>
              <p className="tv4-user-help">Vô hiệu hóa sẽ chặn đăng nhập và các yêu cầu truy cập tiếp theo, giữ nguyên hồ sơ và lịch sử. Kích hoạt lại cho phép tài khoản truy cập trở lại.</p>
              {!readOnly && <details className="tv4-user-danger-zone"><summary>Thao tác nâng cao</summary><p>Chỉ xóa tài khoản tạo nhầm, đã vô hiệu hóa và không có dữ liệu liên quan. Tài khoản có lịch sử sử dụng nên được giữ ở trạng thái vô hiệu hóa.</p><button type="button" className="tv4-user-button is-danger" disabled={busy || user.isActive !== false || dirty} onClick={() => { setValidationError(''); setStep('delete'); }}><Trash2 size={16} aria-hidden="true" />Xóa vĩnh viễn</button>{(user.isActive !== false || dirty) && <p>Hãy lưu trạng thái vô hiệu hóa trước khi xóa.</p>}</details>}
            </div>}
          </div>
        </>}
        {step === 'confirm' && <div className="tv4-user-confirm"><h4 id="user-action-title" tabIndex={-1}>Xác nhận thay đổi tài khoản</h4><p>Kiểm tra các thay đổi của <strong>{user.fullName}</strong> trước khi lưu.</p><dl className="tv4-user-facts">{changes.departmentId !== undefined && <div><dt>Phòng ban</dt><dd>{userDepartmentName(user)} → {departments.find(dept => dept.id === changes.departmentId)?.name}</dd></div>}{changes.jobTitle !== undefined && <div><dt>Chức danh</dt><dd>{user.jobTitle || 'Chưa cập nhật'} → {changes.jobTitle || 'Chưa cập nhật'}</dd></div>}{changes.role !== undefined && <div><dt>Vai trò</dt><dd>{USER_ROLE_LABELS[user.role]} → {USER_ROLE_LABELS[role]}</dd></div>}{changes.isActive !== undefined && <div><dt>Trạng thái</dt><dd>{isActive ? 'Kích hoạt lại tài khoản' : 'Vô hiệu hóa tài khoản'}</dd></div>}</dl><p className="tv4-user-note">{changes.isActive === false ? 'Tài khoản sẽ bị chặn truy cập từ yêu cầu tiếp theo. Hồ sơ và lịch sử vẫn được giữ nguyên.' : 'Quyền mới được backend áp dụng từ yêu cầu tiếp theo. Người dùng có thể cần đăng nhập lại để giao diện hiển thị vai trò mới.'}</p></div>}
        {step === 'delete' && <div className="tv4-user-confirm"><h4 id="user-action-title" tabIndex={-1}>Xóa vĩnh viễn tài khoản?</h4><p>Hành động này không thể hoàn tác. Hệ thống sẽ từ chối xóa nếu tài khoản còn dữ liệu liên quan.</p><label className="tv4-user-fields">Nhập họ tên để xác nhận<input autoComplete="off" disabled={busy} value={deleteName} onChange={event => setDeleteName(event.target.value)} placeholder={user.fullName} /></label></div>}
        {step === 'discard' && <div className="tv4-user-confirm"><h4 id="user-action-title" tabIndex={-1}>Bỏ các thay đổi chưa lưu?</h4><p>Thông tin bạn vừa chỉnh sửa chưa được cập nhật vào hệ thống.</p></div>}
        {step !== 'discard' && (validationError || error) && <p ref={errorRef} tabIndex={-1} role="alert" className="tv4-user-error"><AlertCircle size={18} aria-hidden="true" />{validationError || error}</p>}
      </div>
      <footer className="tv4-user-drawer-footer">
        {step === 'edit' ? <><span className="tv4-user-help">{dirty ? 'Có thay đổi chưa lưu' : 'Thông tin hiện tại'}</span><div><button type="button" className="tv4-user-button" disabled={busy} onClick={requestClose}>{readOnly ? 'Đóng' : 'Hủy'}</button>{!readOnly && <button type="submit" className="tv4-user-button is-primary" disabled={busy || !dirty}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button>}</div></>
        : <><button type="button" className="tv4-user-button" disabled={busy} onClick={() => setStep('edit')}><ArrowLeft size={16} aria-hidden="true" />Quay lại</button><button type="button" className={`tv4-user-button ${step === 'delete' ? 'is-danger' : 'is-primary'}`} disabled={busy || (step === 'delete' && deleteName.trim() !== user.fullName.trim())} onClick={() => { if (step === 'discard') onClose(); else if (step === 'delete') onDelete(); else onSave(changes); }}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? 'Đang xử lý...' : step === 'delete' ? 'Xóa vĩnh viễn' : step === 'discard' ? 'Bỏ thay đổi' : 'Xác nhận lưu'}</button></>}
      </footer>
    </form>
  </dialog>;
}
