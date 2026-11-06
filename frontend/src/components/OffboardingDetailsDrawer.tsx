import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock3, RefreshCw, X } from 'lucide-react';
import type { OffboardingCase } from '../api/offboarding.api';
import { offboardingStatusLabels } from './offboarding';

interface Props {
  record: OffboardingCase;
  departmentName?: string;
  busy: boolean;
  confirmingRetry: boolean;
  onClose: () => void;
  onRequestRetry: () => void;
  onCancelRetry: () => void;
  onConfirmRetry: () => void;
}
const channels = [['itNotified', 'IT'], ['financeNotified', 'Kế toán'], ['employeeNotified', 'Nhân viên'], ['telegramNotified', 'Telegram']] as const;
const date = (value: string) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
export function OffboardingDetailsDrawer({ record, departmentName, busy, confirmingRetry, onClose, onRequestRetry, onCancelRetry, onConfirmRetry }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  if (typeof document === 'undefined') return null;
  const retryable = ['APPROVED', 'PARTIAL', 'FAILED'].includes(record.status);
  return createPortal(<dialog ref={ref} className="tv4-ui tv4-off-drawer" aria-labelledby="tv4-off-detail-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget || busy) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }}>
    <header><div><small>Hồ sơ #{record.id}</small><h3 id="tv4-off-detail-title">Chi tiết thôi việc</h3></div><button type="button" className="tv4-user-icon-button" aria-label="Đóng chi tiết hồ sơ" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <div className="tv4-off-drawer-body"><h4>{record.employee.fullName || `Nhân viên #${record.employee.id}`}</h4><p>{departmentName || 'Chưa có phòng ban'}</p><span className={`tv4-off-badge is-${record.status.toLowerCase()}`}>{offboardingStatusLabels[record.status]}</span>
      <h4 className="tv4-off-section-title">Thông tin hồ sơ</h4>
      <dl><div><dt>Ngày làm việc cuối</dt><dd>{record.lastWorkingDate.split('-').reverse().join('/')}</dd></div><div><dt>Người duyệt</dt><dd>{record.approvedBy.fullName || `#${record.approvedBy.id}`}</dd></div><div><dt>Email tài khoản</dt><dd>{record.employee.email || 'Chưa có'}</dd></div><div><dt>Email nhận thông báo</dt><dd>{record.personalEmail || 'Chưa cung cấp'}</dd></div><div><dt>Ngày duyệt</dt><dd>{date(record.approvedAt)}</dd></div><div><dt>Cập nhật gần nhất</dt><dd>{date(record.updatedAt)}</dd></div><div className="tv4-off-wide"><dt>Lý do thôi việc</dt><dd>{record.reason || 'Không có ghi chú'}</dd></div><div className="tv4-off-wide"><dt>Tài sản bàn giao</dt><dd>{record.assetNotes || 'Không có ghi chú'}</dd></div><div className="tv4-off-wide"><dt>Khảo sát</dt><dd>{record.exitSurveyUrl && /^https?:\/\//i.test(record.exitSurveyUrl) ? <a href={record.exitSurveyUrl} target="_blank" rel="noreferrer">Mở khảo sát thôi việc</a> : 'Chưa có đường dẫn trong hồ sơ'}</dd></div></dl>
      <h4 className="tv4-off-section-title">Kết quả thông báo</h4><ul className="tv4-off-deliveries">{channels.map(([key, label]) => <li key={key}>{record.delivery[key] ? <CheckCircle2 size={19} className="is-delivered" aria-hidden="true" /> : <Clock3 size={19} aria-hidden="true" />}<div><strong>{label}</strong><span>{record.delivery[key] ? 'Đã ghi nhận gửi thành công' : 'Chưa có xác nhận'}</span></div></li>)}</ul>
      <p className="tv4-off-note">Trạng thái thông báo không thay thế xác nhận bàn giao, thu hồi quyền truy cập hoặc quyết toán.</p>
      {confirmingRetry && retryable && <div className="tv4-off-confirm" role="group" aria-label="Xác nhận xử lý lại"><p>Yêu cầu xử lý lại các kênh chưa có xác nhận? Hãy bảo đảm đợt xử lý trước đã kết thúc để hạn chế gửi trùng.</p><button type="button" className="tv4-user-button" disabled={busy} onClick={onCancelRetry}>Quay lại</button><button type="button" className="tv4-user-button is-primary" disabled={busy} onClick={onConfirmRetry}>{busy ? 'Đang yêu cầu…' : 'Xác nhận xử lý lại'}</button></div>}
    </div><footer><button type="button" className="tv4-user-button" disabled={busy} onClick={onClose}>Đóng</button>{retryable && !confirmingRetry && <button type="button" className="tv4-user-button is-primary" disabled={busy} onClick={onRequestRetry}><RefreshCw size={16} />Yêu cầu xử lý lại</button>}</footer>
  </dialog>, document.body);
}
