/**
 * The cache seam. Today the only implementation is in-process, which is the
 * right call for a single-container deployment. Behind this interface a Redis
 * (or Memcached) store can be dropped in for a horizontally scaled one without
 * any caller changing.
 */
export interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  /** Drops every entry whose key starts with `prefix`. */
  invalidatePrefix(prefix: string): void;
  clear(): void;
  readonly size: number;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * A bounded TTL cache. The bound matters: an unbounded map keyed by user and
 * query is a memory leak wearing a cache costume.
 */
export class InMemoryTtlCache<T> implements CacheStore<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Refresh recency for the LRU eviction below.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.ttlMs <= 0) {
      return;
    }

    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
