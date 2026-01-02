export type RequestDeduplicatorErrorStrategy = "remove" | "keep";

export type RequestDeduplicatorBackoff = "linear" | "exponential";

export type RequestDeduplicatorOptions = {
  ttl?: number;
  maxSize?: number;
  pruneWhenSizeOver?: number;
  enableMetrics?: boolean;
  errorStrategy?: RequestDeduplicatorErrorStrategy;
  maxRetries?: number;
  retryDelayMs?: number;
  backoff?: RequestDeduplicatorBackoff;
};

export type RequestDeduplicatorMetrics = {
  name: string;
  size: number;
  calls: number;
  hits: number;
  misses: number;
  evictions: number;
  prunes: number;
  retries: number;
  errors: number;
};

type Entry = {
  promise: Promise<unknown>;
  expiresAt: number;
  createdAt: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function evictOldestKeys<K, V>(cache: Map<K, V>, maxSize: number): number {
  if (!(maxSize > 0)) return 0;
  let evicted = 0;
  while (cache.size >= maxSize) {
    const oldestKey = cache.keys().next().value as K | undefined;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
    evicted += 1;
  }
  return evicted;
}

export class RequestDeduplicator<T = unknown> {
  private readonly name: string;
  private readonly cache = new Map<string, Entry>();
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly pruneWhenSizeOver: number;
  private readonly enableMetrics: boolean;
  private readonly errorStrategy: RequestDeduplicatorErrorStrategy;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly backoff: RequestDeduplicatorBackoff;

  private metrics: Omit<RequestDeduplicatorMetrics, "name" | "size"> = {
    calls: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    prunes: 0,
    retries: 0,
    errors: 0,
  };

  constructor(name: string, options?: RequestDeduplicatorOptions) {
    this.name = name;
    this.ttlMs = Math.max(0, options?.ttl ?? 30_000);
    this.maxSize = Math.max(1, options?.maxSize ?? 200);
    this.pruneWhenSizeOver = Math.max(1, options?.pruneWhenSizeOver ?? 50);
    this.enableMetrics = options?.enableMetrics === true;
    this.errorStrategy = options?.errorStrategy ?? "remove";
    this.maxRetries = Math.max(0, options?.maxRetries ?? 0);
    this.retryDelayMs = Math.max(0, options?.retryDelayMs ?? 250);
    this.backoff = options?.backoff ?? "linear";
  }

  getSize(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  getMetrics(): RequestDeduplicatorMetrics {
    return {
      name: this.name,
      size: this.cache.size,
      ...this.metrics,
    };
  }

  private bump<K extends keyof typeof this.metrics>(key: K, by: number = 1): void {
    if (!this.enableMetrics) return;
    this.metrics[key] += by;
  }

  private pruneExpired(now: number): void {
    if (this.cache.size <= this.pruneWhenSizeOver) return;
    let pruned = 0;
    for (const [k, v] of this.cache) {
      if (v.expiresAt <= now) {
        this.cache.delete(k);
        pruned += 1;
      }
    }
    if (pruned > 0) this.bump("prunes", pruned);
  }

  private async runWithRetries<U>(fn: () => Promise<U>): Promise<U> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (attempt >= this.maxRetries) throw error;
        attempt += 1;
        this.bump("retries", 1);
        const factor = this.backoff === "exponential" ? Math.pow(2, attempt - 1) : attempt;
        await sleep(this.retryDelayMs * factor);
      }
    }
  }

  async dedupe<U = T>(key: string, request: () => Promise<U>): Promise<U> {
    const now = Date.now();
    this.bump("calls", 1);
    this.pruneExpired(now);

    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > now) {
      this.bump("hits", 1);
      return existing.promise as Promise<U>;
    }

    this.bump("misses", 1);

    const promise = this.runWithRetries(request).catch((error) => {
      this.bump("errors", 1);
      throw error;
    });

    const entry: Entry = {
      promise,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };

    const evicted = evictOldestKeys(this.cache, this.maxSize);
    if (evicted > 0) this.bump("evictions", evicted);
    this.cache.set(key, entry);

    void promise
      .then(() => {
        if (this.errorStrategy === "remove") {
          const cur = this.cache.get(key);
          if (cur?.promise === promise) this.cache.delete(key);
        }
      })
      .catch(() => {
        if (this.errorStrategy === "remove") {
          const cur = this.cache.get(key);
          if (cur?.promise === promise) this.cache.delete(key);
        }
      });

    return promise;
  }
}

export class RequestDeduplicatorFactory {
  private static instances = new Map<string, RequestDeduplicator<any>>();

  static create<T = unknown>(name: string, options?: RequestDeduplicatorOptions): RequestDeduplicator<T> {
    const existing = this.instances.get(name) as RequestDeduplicator<T> | undefined;
    if (existing) return existing;
    const inst = new RequestDeduplicator<T>(name, options);
    this.instances.set(name, inst as RequestDeduplicator<any>);
    return inst;
  }

  static getMetrics(): RequestDeduplicatorMetrics[] {
    return Array.from(this.instances.values()).map((d) => d.getMetrics());
  }

  static clearAll(): void {
    for (const d of this.instances.values()) d.clear();
  }
}

