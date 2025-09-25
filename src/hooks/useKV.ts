import { useCallback, useEffect, useState } from "react";

type Updater<T> = T | ((previous: T) => T);

function readValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return fallback;
    }
    return JSON.parse(stored) as T;
  } catch (error) {
    console.warn(`useKV: failed to read key "${key}" from localStorage`, error);
    return fallback;
  }
}

export function useKV<T>(key: string, initialValue: T): [T, (value: Updater<T>) => void] {
  const [value, setValue] = useState<T>(() => readValue(key, initialValue));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`useKV: failed to write key "${key}" to localStorage`, error);
    }
  }, [key, value]);

  const updateValue = useCallback(
    (updater: Updater<T>) => {
      setValue(prev => (typeof updater === "function" ? (updater as (previous: T) => T)(prev) : updater));
    },
    []
  );

  return [value, updateValue];
}
