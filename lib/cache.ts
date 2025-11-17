interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 30000,
    staleWhileRevalidate: boolean = true
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }
    if (cached && staleWhileRevalidate && now >= cached.expiresAt) {
      const staleData = cached.data;
      this.fetchAndCache(key, fetcher, ttl).catch(() => {});
      return staleData;
    }
    return this.fetchAndCache(key, fetcher, ttl);
  }
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }
    const request = fetcher()
      .then((data) => {
        const now = Date.now();
        this.cache.set(key, {
          data,
          timestamp: now,
          expiresAt: now + ttl,
        });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });
    this.pendingRequests.set(key, request);
    return request;
  }
  set<T>(key: string, data: T, ttl: number = 30000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }
  getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    return cached.data;
  }
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() < cached.expiresAt;
  }
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    } else {
      this.cache.clear();
      this.pendingRequests.clear();
    }
  }
  clearByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((item, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });
  }
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((item, key) => {
      if (now >= item.expiresAt) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}
export const cacheManager = new CacheManager();
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanup();
  }, 5 * 60 * 1000);
}
export class LocalStorageCache {
  private prefix: string;
  constructor(prefix: string = 'explorer_') {
    this.prefix = prefix;
  }
  set<T>(key: string, data: T, ttl?: number): void {
    if (typeof window === 'undefined') return;
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : Infinity,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {}
  }
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      const cached: CacheItem<T> = JSON.parse(item);
      if (cached.expiresAt !== Infinity && Date.now() >= cached.expiresAt) {
        this.remove(key);
        return null;
      }
      return cached.data;
    } catch (error) {
      return null;
    }
  }
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }
  clear(): void {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}
export const chainCache = new LocalStorageCache('chain_');
