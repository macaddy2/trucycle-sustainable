import { useCallback, useEffect, useState } from "react";

// Broadcast channel/event name for intra-app KV updates
const KV_EVENT_NAME = 'kv-change';
type KVEventDetail<T> = { key: string; value: T };

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
      // Also broadcast a KV change event so other hook instances in the same tab update immediately
      try {
        const detail: KVEventDetail<T> = { key, value } as KVEventDetail<T>;
        window.dispatchEvent(new CustomEvent(KV_EVENT_NAME, { detail } as CustomEventInit<KVEventDetail<T>>));
      } catch {}
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

  // Listen for cross-tab storage changes and same-tab KV events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        const next = e.newValue === null ? initialValue : (JSON.parse(e.newValue) as T);
        setValue(next);
      } catch {
        setValue(initialValue);
      }
    };

    const handleKVEvent = (e: Event) => {
      const ce = e as CustomEvent<KVEventDetail<T>>;
      if (!ce?.detail || ce.detail.key !== key) return;
      setValue(ce.detail.value);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(KV_EVENT_NAME, handleKVEvent as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(KV_EVENT_NAME, handleKVEvent as EventListener);
    };
  }, [key, initialValue]);

  return [value, updateValue];
}
