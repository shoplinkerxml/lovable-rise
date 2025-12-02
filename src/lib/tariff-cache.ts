import { readCache, writeCache, removeCache, CACHE_TTL, type CacheEnvelope } from './cache-utils';

const KEY = 'rq:tariffs:list';
const SOFT_REFRESH_THRESHOLD_MS = 120000;

export async function getTariffsListCached<T>(fetch: () => Promise<T[]>): Promise<T[]> {
  const cached = readCache<T[]>(KEY);
  if (cached) {
    const timeLeft = cached.expiresAt - Date.now();
    if (timeLeft > 0) {
      if (timeLeft < SOFT_REFRESH_THRESHOLD_MS) {
        void fetch().then(rows => writeCache(KEY, rows, CACHE_TTL.tariffsList)).catch(() => void 0);
      }
      return cached.data;
    }
  }
  const rows = await fetch();
  writeCache(KEY, rows, CACHE_TTL.tariffsList);
  return rows;
}

export function invalidateTariffsCache(): void {
  removeCache(KEY);
}

const TariffCache = {
  getTariffsListCached,
  invalidateTariffsCache,
  get<T>(): T | null {
    const cached = readCache<T>(KEY);
    return cached ? cached.data : null;
  },
  set<T>(data: T): void {
    writeCache(KEY, data, CACHE_TTL.tariffsList);
  },
  clear(): void {
    removeCache(KEY);
  }
};

export default TariffCache;
