const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
export function getApiUrl(endpoint: string): string {
  return endpoint;
}
export async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = getApiUrl(endpoint);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const response = await fetch(url, { 
      ...options,
      signal: controller.signal,
      cache: 'no-store',
      mode: 'cors',
      headers: {
        ...options?.headers,
        'Accept': 'application/json',
      }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error: any) {
    if (error.name === 'TypeError' || error.name === 'AbortError') {
      try {
        const response = await fetch(url, { 
          ...options, 
          cache: 'no-store',
          mode: 'cors'
        });
        return response;
      } catch (retryError: any) {
      }
    }
    throw error;
  }
}
