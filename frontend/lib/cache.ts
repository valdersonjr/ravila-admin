const store = new Map<string, { data: unknown; expires: number }>();

const DEFAULT_TTL = 2 * 60 * 1000; // 2 minutos

export function cached<T>(key: string, fn: () => Promise<T>, ttlMs = DEFAULT_TTL): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data as T);
  return fn().then((data) => {
    store.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  });
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
