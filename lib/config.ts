export const API_URL = '';
export function getApiUrl(path: string): string {
  if (!API_URL) {
    return `/${path}`;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
}
export const CACHE_DURATION = {
  CHAINS: 3600000,
  VALIDATORS: 30000,
  BLOCKS: 10000,
  TRANSACTIONS: 10000,
  PROPOSALS: 60000,
  ASSETS: 60000,
  NETWORK: 30000,
};
