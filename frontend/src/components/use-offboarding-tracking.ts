import { useEffect, useRef, useState } from 'react';
import { offboardingApi, type OffboardingCase } from '../api/offboarding.api';

// Read-only tracking: never starts an execution or automatically retries delivery.
export function useOffboardingTracking(active: boolean, pendingKey: string, cycle: number, onUpdate: (records: OffboardingCase[]) => void) {
  const [state, setState] = useState<'idle' | 'tracking' | 'waiting' | 'offline'>('idle');
  const callback = useRef(onUpdate);
  useEffect(() => { callback.current = onUpdate; }, [onUpdate]);
  useEffect(() => {
    if (!active || !pendingKey) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const deadline = Date.now() + 120_000;
    const tick = async () => {
      if (stopped) return;
      if (Date.now() >= deadline) { setState('waiting'); return; }
      if (document.visibilityState === 'visible') {
        try {
          const records = await offboardingApi.list(controller.signal);
          if (!stopped) { callback.current(records); setState('tracking'); }
        } catch { if (!stopped) setState('offline'); }
      }
      if (!stopped) timer = setTimeout(() => void tick(), 5000);
    };
    timer = setTimeout(() => { setState('tracking'); void tick(); }, 5000);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [active, pendingKey, cycle]);
  return active && pendingKey ? state : 'idle';
}
