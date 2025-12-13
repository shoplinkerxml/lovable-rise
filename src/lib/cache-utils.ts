export const CACHE_TTL = {
  productsPage: 900_000,
  shopsList: 900_000,
  categoryFilters: 300_000,
  productLinks: 120_000,
  uiPrefs: 2_592_000_000,
  tariffsList: 900_000,
  limits: 900_000,
  supplierCategoriesMap: 600_000,
} as const;

export type CacheEnvelope<T> = { data: T; expiresAt: number };

export function readCache<T>(key: string, allowStale = false): CacheEnvelope<T> | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
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
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ data, expiresAt: Date.now() + ttlMs });
    window.localStorage.setItem(key, payload);
  } catch {
    /* ignore */
  }
}

export function removeCache(key: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
