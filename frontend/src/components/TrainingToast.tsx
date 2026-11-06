import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X } from 'lucide-react';
import './training-toast.css';

interface Props {
  message: string;
  success: boolean;
  error?: boolean;
  onClose: () => void;
}

export function TrainingToast({ message, success, error = false, onClose }: Props) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onClose, success ? 5000 : 8000);
    return () => window.clearTimeout(timer);
  }, [success, onClose, paused]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`tv4-ui tv4-training-toast ${success ? 'is-success' : error ? 'is-error' : 'is-warning'}`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      {success ? <CheckCircle2 size={20} aria-hidden="true" /> : <Info size={20} aria-hidden="true" />}
      <p role={success ? 'status' : 'alert'} aria-atomic="true">{message}</p>
      <button type="button" aria-label="Đóng thông báo" onClick={onClose}><X size={18} aria-hidden="true" /></button>
    </div>, document.body,
  );
}
