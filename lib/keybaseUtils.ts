export async function fetchKeybaseAvatar(identity: string): Promise<string | null> {
  if (!identity || identity.length < 16) {
    return null;
  }
  try {
    const response = await fetch(`/api/keybase?identity=${identity}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.avatarUrl) {
      return data.avatarUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
}
export function getCachedAvatar(identity: string): string | null {
  try {
    const cacheKey = `keybase_avatar_${identity}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const { url, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
export function cacheAvatar(identity: string, url: string): void {
  try {
    const cacheKey = `keybase_avatar_${identity}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      url,
      timestamp: Date.now()
    }));
  } catch (error) {}
}
export async function getValidatorAvatar(identity: string): Promise<string | null> {
  const cached = getCachedAvatar(identity);
  if (cached) return cached;
  const url = await fetchKeybaseAvatar(identity);
  if (url) {
    cacheAvatar(identity, url);
  }
  return url;
}
