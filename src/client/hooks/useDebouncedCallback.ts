import { useEffect, useRef, useCallback } from "react";

export function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, ms: number) {
  const ref = useRef<number | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => {
    return () => {
      if (ref.current) window.clearTimeout(ref.current);
    };
  }, []);
  return useCallback(
    (...args: Parameters<T>) => {
      if (ref.current) window.clearTimeout(ref.current);
      ref.current = window.setTimeout(() => fnRef.current(...args), ms);
    },
    [ms],
  );
}
