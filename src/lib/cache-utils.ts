export const CACHE_TTL = {
  productsPage: 900_000,
  shopsList: 900_000,
  categoryFilters: 300_000,
  productLinks: 120_000,
  uiPrefs: 2_592_000_000,
  tariffsList: 900_000,
  suppliersList: 900_000,
  limits: 900_000,
  supplierCategoriesMap: 600_000,
  authMe: 86_400_000,
} as const;

export type CacheEnvelope<T> = { data: T; expiresAt: number };

const CACHE_VERSION_PREFIX = "v1:";
const memoryCache = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function withVersion(key: string): string {
  return `${CACHE_VERSION_PREFIX}${key}`;
}

export function readCache<T>(key: string, allowStale = false): CacheEnvelope<T> | null {
  try {
    const storage = getStorage();
    const session = getSessionStorage();
    const versionedKey = withVersion(key);
    const raw =
      (storage?.getItem(versionedKey) ??
        storage?.getItem(key) ??
        session?.getItem(versionedKey) ??
        session?.getItem(key) ??
        memoryCache.get(versionedKey) ??
        memoryCache.get(key)) || null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || parsed.data === undefined || parsed.data === null) return null;
    if (!allowStale && typeof parsed.expiresAt === "number" && parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T, ttlMs: number): void {
  try {
    const payload = JSON.stringify({ data, expiresAt: Date.now() + ttlMs });
    const storage = getStorage();
    const session = getSessionStorage();
    const versionedKey = withVersion(key);
    if (storage) {
      storage.setItem(versionedKey, payload);
    } else if (session) {
      session.setItem(versionedKey, payload);
    } else {
      memoryCache.set(versionedKey, payload);
    }
  } catch {
    /* ignore */
  }
}

export function removeCache(key: string): void {
  try {
    const storage = getStorage();
    const session = getSessionStorage();
    const versionedKey = withVersion(key);
    if (storage) storage.removeItem(versionedKey);
    if (session) session.removeItem(versionedKey);
    memoryCache.delete(versionedKey);
  } catch {
    /* ignore */
  }
}

export function cleanupExpired(prefix: string = CACHE_VERSION_PREFIX): void {
  try {
    const storage = getStorage();
    const session = getSessionStorage();
    const scan = (s: Storage | null) => {
      if (!s) return;
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      for (const k of keys) {
        try {
          const raw = s.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as CacheEnvelope<unknown>;
          if (typeof parsed?.expiresAt === "number" && parsed.expiresAt <= Date.now()) {
            s.removeItem(k);
          }
        } catch {
          s.removeItem(k);
        }
      }
    };
    scan(storage);
    scan(session);
    for (const [k, v] of Array.from(memoryCache.entries())) {
      try {
        const parsed = JSON.parse(v) as CacheEnvelope<unknown>;
        if (typeof parsed?.expiresAt === "number" && parsed.expiresAt <= Date.now()) {
          memoryCache.delete(k);
        }
      } catch {
        memoryCache.delete(k);
      }
    }
  } catch {
    /* ignore */
  }
}
