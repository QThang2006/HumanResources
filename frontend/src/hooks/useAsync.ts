import { useState, useCallback } from 'react';

export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * ⚡ Custom Hook quản lý trạng thái gọi API bất đồng bộ (Loading, Error, Data)
 */
export function useAsync<T>() {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (promise: Promise<T>): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await promise;
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error: errorObj });
      return null;
    }
  }, []);

  return { ...state, execute };
}
