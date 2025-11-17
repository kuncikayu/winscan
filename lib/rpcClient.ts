interface RPCConfig {
  url: string;
  timeout?: number;
  retries?: number;
}
interface CacheConfig {
  key: string;
  ttl: number; // in seconds
}
class RPCClient {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  constructor() {
    this.cache = new Map();
  }
  async fetch<T>(
    rpcUrls: string[],
    endpoint: string,
    cacheConfig?: CacheConfig,
    options: RequestInit = {}
  ): Promise<T> {
    if (cacheConfig) {
      const cached = this.getFromCache(cacheConfig.key);
      if (cached) {
        console.log(`[RPC] Cache hit for ${cacheConfig.key}`);
        return cached as T;
      }
    }
    let lastError: any;
    for (const rpcUrl of rpcUrls) {
      try {
        const url = `${rpcUrl}${endpoint}`;
        console.log(`[RPC] Fetching from ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (cacheConfig) {
          this.setCache(cacheConfig.key, data, cacheConfig.ttl);
        }
        return data as T;
      } catch (error: any) {
        lastError = error;
        console.warn(`[RPC] Failed to fetch from ${rpcUrl}: ${error.message}`);
        continue; // Try next RPC
      }
    }
    throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`);
  }
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }
  clearCache(): void {
    this.cache.clear();
  }
  clearCacheKey(key: string): void {
    this.cache.delete(key);
  }
}
export const rpcClient = new RPCClient();
export async function fetchValidators(rpcUrls: string[], status: string = 'BOND_STATUS_BONDED') {
  return rpcClient.fetch(
    rpcUrls,
    `/cosmos/staking/v1beta1/validators?status=${status}&pagination.limit=1000`,
    {
      key: `validators_${status}`,
      ttl: 30, // 30 seconds cache
    }
  );
}
export async function fetchValidator(rpcUrls: string[], address: string) {
  return rpcClient.fetch(
    rpcUrls,
    `/cosmos/staking/v1beta1/validators/${address}`,
    {
      key: `validator_${address}`,
      ttl: 30,
    }
  );
}
export async function fetchLatestBlock(rpcUrls: string[]) {
  return rpcClient.fetch(
    rpcUrls,
    `/cosmos/base/tendermint/v1beta1/blocks/latest`,
    {
      key: 'latest_block',
      ttl: 6, // 6 seconds cache (1 block)
    }
  );
}
export async function fetchTransactions(rpcUrls: string[], query?: string) {
  const endpoint = query 
    ? `/cosmos/tx/v1beta1/txs?query=${encodeURIComponent(query)}`
    : `/cosmos/tx/v1beta1/txs?pagination.limit=20`;
  return rpcClient.fetch(
    rpcUrls,
    endpoint,
    {
      key: `txs_${query || 'latest'}`,
      ttl: 10,
    }
  );
}
