import { Tariff } from './tariff-service';

class TariffCache {
  private static instance: TariffCache;
  private cache: Tariff[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {}

  static getInstance(): TariffCache {
    if (!TariffCache.instance) {
      TariffCache.instance = new TariffCache();
    }
    return TariffCache.instance;
  }

  set(tariffs: Tariff[]): void {
    this.cache = tariffs;
    this.cacheTimestamp = Date.now();
  }

  get(): Tariff[] | null {
    // Check if cache is still valid
    if (this.cache && this.cacheTimestamp) {
      const now = Date.now();
      if (now - this.cacheTimestamp < this.CACHE_DURATION) {
        return this.cache;
      }
    }
    // Cache expired or empty
    this.clear();
    return null;
  }

  clear(): void {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  isValid(): boolean {
    if (!this.cacheTimestamp) return false;
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }
}

export default TariffCache.getInstance();