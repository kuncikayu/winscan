const CACHE_VERSION = 'v1';
const CACHE_EXPIRY = 30000; // 30 seconds
export interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}
export function getCacheKey(prefix: string, chainName: string, suffix?: string): string {
  return `${CACHE_VERSION}_${prefix}_${chainName}${suffix ? `_${suffix}` : ''}`;
}
export function setCache<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (err) {
    console.warn('Failed to set cache:', err);
  }
}
export function getCache<T>(key: string, maxAge: number = CACHE_EXPIRY): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const cacheData: CacheData<T> = JSON.parse(cached);
    if (cacheData.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - cacheData.timestamp > maxAge) {
      return null; // Return null but don't remove - still useful for initial display
    }
    return cacheData.data;
  } catch (err) {
    console.warn('Failed to get cache:', err);
    return null;
  }
}
export function getStaleCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const cacheData: CacheData<T> = JSON.parse(cached);
    if (cacheData.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    return cacheData.data;
  } catch (err) {
    return null;
  }
}
export function clearCache(prefix?: string): void {
  try {
    if (prefix) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${CACHE_VERSION}_${prefix}`)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      localStorage.clear();
    }
  } catch (err) {
    console.warn('Failed to clear cache:', err);
  }
}
