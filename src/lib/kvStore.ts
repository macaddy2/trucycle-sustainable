function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn("kvStore: localStorage is not available", error);
    return null;
  }
}

function safeParse<T>(value: string | null): T | undefined {
  if (value === null) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("kvStore: failed to parse stored value", error);
    return undefined;
  }
}

export async function kvKeys(): Promise<string[]> {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => Boolean(key)
  );
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const storage = getStorage();
  if (!storage) {
    return undefined;
  }

  return safeParse<T>(storage.getItem(key));
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`kvStore: failed to persist key "${key}"`, error);
  }
}

export async function kvDelete(key: string): Promise<void> {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(key);
}
