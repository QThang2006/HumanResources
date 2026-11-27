import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock3, LockKeyhole, RefreshCw, X } from 'lucide-react';
import type { OffboardingCase } from '../api/offboarding.api';
import { offboardingStatusLabels, vietnamToday } from './offboarding';

interface Props {
  record: OffboardingCase;
  departmentName?: string;
  busy: boolean;
  confirmingRetry: boolean;
  onClose: () => void;
  onRequestRetry: () => void;
  onCancelRetry: () => void;
  onConfirmRetry: () => void;
  onCancelCase?: () => Promise<void>;
  onFinalizeCase?: () => Promise<void>;
}
const channels = [['itNotified', 'IT'], ['financeNotified', 'Kế toán'], ['employeeNotified', 'Nhân viên'], ['telegramNotified', 'Telegram']] as const;
const date = (value: string) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
export function OffboardingDetailsDrawer({ record, departmentName, busy, confirmingRetry, onClose, onRequestRetry, onCancelRetry, onConfirmRetry, onCancelCase, onFinalizeCase }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const headerClose = useRef<HTMLButtonElement>(null);
  const actionLock = useRef(false);
  const lastAction = useRef<'cancel' | 'finalize' | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const finalizeButton = useRef<HTMLButtonElement>(null);
  const [action, setAction] = useState<'cancel' | 'finalize' | null>(null);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (action) backRef.current?.focus();
    else if (lastAction.current) {
      ((lastAction.current === 'cancel' ? cancelButton : finalizeButton).current || headerClose.current)?.focus();
      lastAction.current = null;
    }
  }, [action]);
  const requestAction = (next: 'cancel' | 'finalize') => {
    lastAction.current = next;
    setActionError(''); setAction(next);
  };
  const confirmAction = async () => {
    if (actionLock.current || busy) return;
    actionLock.current = true; setActionError('');
    try {
      if (action === 'cancel') await onCancelCase?.();
      else if (action === 'finalize') await onFinalizeCase?.();
      setAction(null);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ. Hãy thử lại.'); }
    finally { actionLock.current = false; }
  };
  const leave = () => { if (action) { setAction(null); setActionError(''); } else onClose(); };
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  if (typeof document === 'undefined') return null;
  const retryable = ['APPROVED', 'PARTIAL', 'FAILED'].includes(record.status);
  const open = !['COMPLETED', 'CANCELLED'].includes(record.status);
  const canFinalize = record.lastWorkingDate <= vietnamToday();
  return createPortal(<dialog ref={ref} className="tv4-ui tv4-off-drawer" role={action ? 'alertdialog' : undefined} aria-describedby={action ? 'tv4-off-action-description' : undefined} aria-labelledby="tv4-off-detail-title" onCancel={event => { event.preventDefault(); if (!busy) leave(); }} onClick={event => {
    if (event.target !== event.currentTarget || busy) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) leave();
  }}>
    <header><div><small>Hồ sơ #{record.id}</small><h3 id="tv4-off-detail-title">{action === 'cancel' ? 'Hủy hồ sơ thôi việc?' : action === 'finalize' ? 'Đóng hồ sơ và khóa tài khoản?' : 'Chi tiết thôi việc'}</h3></div><button type="button" ref={headerClose} className="tv4-user-icon-button" aria-label="Đóng chi tiết hồ sơ" disabled={busy} onClick={leave}><X size={20} /></button></header>
    {action ? <div className="tv4-off-drawer-body">
      <p id="tv4-off-action-description">{action === 'cancel'
        ? `Hủy hồ sơ #${record.id} của ${record.employee.fullName || 'nhân sự này'}? Tài khoản được giữ nguyên. Những thông báo đã gửi không thể thu hồi.`
        : `Đóng hồ sơ #${record.id} của ${record.employee.fullName || 'nhân sự này'}? Tài khoản sẽ bị khóa và các phiên đăng nhập hiện có sẽ mất quyền truy cập.`}</p>
      {action === 'finalize' && Boolean(record.managesDepartments?.length) && <p className="tv4-off-warning">Người này đang phụ trách {record.managesDepartments?.map(department => department.name).join(', ')}. Hệ thống sẽ gỡ vai trò trưởng phòng; cần bố trí người tiếp nhận.</p>}
      {actionError && <p className="tv4-off-error" role="alert">{actionError}</p>}
    </div> : <div className="tv4-off-drawer-body"><h4>{record.employee.fullName || `Nhân viên #${record.employee.id}`}</h4><p>{departmentName || 'Chưa có phòng ban'}</p><span className={`tv4-off-badge is-${record.status.toLowerCase()}`}>{offboardingStatusLabels[record.status]}</span>
      {Boolean(record.managesDepartments?.length) && open && <p className="tv4-off-warning">Trưởng phòng: {record.managesDepartments?.map(department => department.name).join(', ')}. Cần sắp xếp người tiếp nhận trước khi đóng hồ sơ.</p>}
      {record.finalizedAt && <p>Đã khóa tài khoản lúc {date(record.finalizedAt)}.</p>}
      <h4 className="tv4-off-section-title">Thông tin hồ sơ</h4>
      <dl><div><dt>Ngày làm việc cuối</dt><dd>{record.lastWorkingDate.split('-').reverse().join('/')}</dd></div><div><dt>Người duyệt</dt><dd>{record.approvedBy.fullName || `#${record.approvedBy.id}`}</dd></div><div><dt>Email tài khoản</dt><dd>{record.employee.email || 'Chưa có'}</dd></div><div><dt>Email nhận thông báo</dt><dd>{record.personalEmail || 'Chưa cung cấp'}</dd></div><div><dt>Ngày duyệt</dt><dd>{date(record.approvedAt)}</dd></div><div><dt>Cập nhật gần nhất</dt><dd>{date(record.updatedAt)}</dd></div><div className="tv4-off-wide"><dt>Lý do thôi việc</dt><dd>{record.reason || 'Không có ghi chú'}</dd></div><div className="tv4-off-wide"><dt>Tài sản bàn giao</dt><dd>{record.assetNotes || 'Không có ghi chú'}</dd></div><div className="tv4-off-wide"><dt>Khảo sát</dt><dd>{record.exitSurveyUrl && /^https?:\/\//i.test(record.exitSurveyUrl) ? <a href={record.exitSurveyUrl} target="_blank" rel="noreferrer">Mở khảo sát thôi việc</a> : 'Chưa có đường dẫn trong hồ sơ'}</dd></div></dl>
      <h4 className="tv4-off-section-title">Kết quả thông báo</h4><ul className="tv4-off-deliveries">{channels.map(([key, label]) => <li key={key}>{record.delivery[key] ? <CheckCircle2 size={19} className="is-delivered" aria-hidden="true" /> : <Clock3 size={19} aria-hidden="true" />}<div><strong>{label}</strong><span>{record.delivery[key] ? 'Đã ghi nhận gửi thành công' : 'Chưa có xác nhận'}</span></div></li>)}</ul>
      <p className="tv4-off-note">Trạng thái thông báo không thay thế xác nhận bàn giao, thu hồi quyền truy cập hoặc quyết toán.</p>
      {confirmingRetry && retryable && <div className="tv4-off-confirm" role="group" aria-label="Xác nhận xử lý lại"><p>Yêu cầu xử lý lại các kênh chưa có xác nhận? Hãy bảo đảm đợt xử lý trước đã kết thúc để hạn chế gửi trùng.</p><button type="button" className="tv4-user-button" disabled={busy} onClick={onCancelRetry}>Quay lại</button><button type="button" className="tv4-user-button is-primary" disabled={busy} onClick={onConfirmRetry}>{busy ? 'Đang yêu cầu…' : 'Xác nhận xử lý lại'}</button></div>}
      {open && <p className="tv4-off-note">Có thể đóng từ ngày làm việc cuối. Nếu chưa đóng thủ công, hệ thống tự đóng và khóa tài khoản sau khi ngày này kết thúc theo giờ Việt Nam.</p>}
    </div>}<footer>{action ? <>
      <button ref={backRef} type="button" className="tv4-user-button" disabled={busy} onClick={leave}>Quay lại</button>
      <button type="button" className="tv4-user-button is-danger" disabled={busy} onClick={() => void confirmAction()}>{busy ? 'Đang xử lý…' : action === 'cancel' ? 'Xác nhận hủy hồ sơ' : 'Xác nhận đóng và khóa'}</button>
    </> : <>
      <button type="button" className="tv4-user-button" disabled={busy} onClick={onClose}>Đóng</button>
      {retryable && !confirmingRetry && <button type="button" className="tv4-user-button" disabled={busy} onClick={onRequestRetry}><RefreshCw size={16} aria-hidden="true" />Yêu cầu xử lý lại</button>}
      {open && onCancelCase && <button type="button" ref={cancelButton} className="tv4-user-button" disabled={busy} onClick={() => requestAction('cancel')}>Hủy hồ sơ</button>}
      {open && onFinalizeCase && <button type="button" ref={finalizeButton} className="tv4-user-button is-primary" disabled={busy || !canFinalize} title={!canFinalize ? 'Chưa đến ngày làm việc cuối' : undefined} onClick={() => requestAction('finalize')}><LockKeyhole size={16} aria-hidden="true" />Đóng hồ sơ &amp; Khóa tài khoản</button>}
    </>}</footer>
  </dialog>, document.body);
}
