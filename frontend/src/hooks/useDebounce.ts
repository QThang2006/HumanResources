import { useState, useEffect } from 'react';

/**
 * ⏳ Custom Hook Debounce giá trị đầu vào (Dùng cho ô tìm kiếm việc làm / ứng viên)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
