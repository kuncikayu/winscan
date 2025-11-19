import { cacheManager, chainCache } from './cache';
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  ttl: number = 30000 // 30 seconds default
): Promise<T> {
  const cacheKey = `fetch_${url}_${JSON.stringify(options || {})}`;
  return cacheManager.get(
    cacheKey,
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    ttl,
    true // Enable stale-while-revalidate
  );
}
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
export async function fetchChains(): Promise<any[]> {
  const cached = chainCache.get<any[]>('chains_list');
  if (cached) {
    fetchChainsFromAPI().catch(() => {});
    return cached;
  }
  return fetchChainsFromAPI();
}
async function fetchChainsFromAPI(): Promise<any[]> {
  const response = await fetch('/api/chains');
  if (!response.ok) {
    throw new Error('Failed to fetch chains');
  }
  const chains = await response.json();
  chainCache.set('chains_list', chains, 60 * 60 * 1000);
  return chains;
}
export const CACHE_CONFIG = {
  chains: 60 * 60 * 1000,
  latestBlocks: 10 * 1000,
  blockDetail: 5 * 60 * 1000,
  transactions: 5 * 60 * 1000,
  transactionDetail: 5 * 60 * 1000,
  validators: 30 * 1000,
  validatorDetail: 60 * 1000,
  proposals: 30 * 1000,
  proposalDetail: 30 * 1000,
  accountBalance: 10 * 1000,
  networkInfo: 20 * 1000,
  parameters: 10 * 60 * 1000,
};
export function prefetchCommonData(chainName: string): void {
  Promise.all([
    fetchWithCache(`/api/blocks?chain=${chainName}&limit=10`, {}, CACHE_CONFIG.latestBlocks),
    fetchWithCache(`/api/validators?chain=${chainName}`, {}, CACHE_CONFIG.validators),
    fetchWithCache(`/api/network?chain=${chainName}`, {}, CACHE_CONFIG.networkInfo),
  ]).catch(() => {});
}
export function clearChainCache(chainName: string): void {  cacheManager.clearByPattern(chainName);
}
export function clearAllCache(): void {  cacheManager.clear();
  chainCache.clear();
}
