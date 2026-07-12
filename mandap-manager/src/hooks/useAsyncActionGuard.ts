import { useCallback, useRef, useState } from 'react';

type AsyncAction<T> = () => Promise<T>;

export function useAsyncActionGuard() {
  const runningKeysRef = useRef(new Set<string>());
  const [runningKeys, setRunningKeys] = useState<Record<string, boolean>>({});

  const setRunning = useCallback((key: string, running: boolean) => {
    setRunningKeys((prev) => {
      if (running) return { ...prev, [key]: true };
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const runGuarded = useCallback(
    async <T,>(action: AsyncAction<T>, key = 'default'): Promise<T | null> => {
      if (runningKeysRef.current.has(key)) return null;

      runningKeysRef.current.add(key);
      setRunning(key, true);
      try {
        return await action();
      } finally {
        runningKeysRef.current.delete(key);
        setRunning(key, false);
      }
    },
    [setRunning]
  );

  const isRunning = useCallback(
    (key = 'default') => Boolean(runningKeys[key]),
    [runningKeys]
  );

  return {
    runGuarded,
    isRunning,
    isAnyRunning: Object.keys(runningKeys).length > 0,
  };
}
