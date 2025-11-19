interface Endpoint {
  address: string;
  provider: string;
  failures?: number;
  lastFailure?: number;
  rateLimit?: number;
  lastRequest?: number;
}
interface EndpointHealth {
  healthy: boolean;
  latency: number;
  lastCheck: number;
}
class APILoadBalancer {
  private endpoints: Endpoint[] = [];
  private currentIndex: number = 0;
  private healthStatus: Map<string, EndpointHealth> = new Map();
  private requestCounts: Map<string, number[]> = new Map();
  private readonly RATE_LIMIT_WINDOW = 10000; // 10 seconds
  private readonly RATE_LIMIT_MAX = 50;
  private readonly MAX_FAILURES = 3;
  private readonly FAILURE_COOLDOWN = 60000; // 1 minute cooldown
  constructor(endpoints: Endpoint[]) {
    this.endpoints = endpoints.map(ep => ({
      ...ep,
      failures: 0,
      lastFailure: 0,
      rateLimit: 0,
    }));
  }
  private getNextEndpoint(): Endpoint | null {
    const startIndex = this.currentIndex;
    let attempts = 0;
    while (attempts < this.endpoints.length) {
      const endpoint = this.endpoints[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
      attempts++;
      if (endpoint.failures && endpoint.failures >= this.MAX_FAILURES) {
        const timeSinceFailure = Date.now() - (endpoint.lastFailure || 0);
        if (timeSinceFailure < this.FAILURE_COOLDOWN) {          continue;
        }
        endpoint.failures = 0;
      }
      if (this.isRateLimited(endpoint.address)) {        continue;
      }
      return endpoint;
    }    return this.endpoints[0] || null;
  }
  private isRateLimited(address: string): boolean {
    const requests = this.requestCounts.get(address) || [];
    const now = Date.now();
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );
    this.requestCounts.set(address, recentRequests);
    return recentRequests.length >= this.RATE_LIMIT_MAX;
  }
  private recordRequest(address: string): void {
    const requests = this.requestCounts.get(address) || [];
    requests.push(Date.now());
    this.requestCounts.set(address, requests);
  }
  private markFailure(endpoint: Endpoint, error: any): void {
    endpoint.failures = (endpoint.failures || 0) + 1;
    endpoint.lastFailure = Date.now();
    console.error(
      `[LoadBalancer] Endpoint ${endpoint.address} failed (${endpoint.failures}/${this.MAX_FAILURES})`,
      error.message
    );
  }
  private markSuccess(endpoint: Endpoint): void {
    if (endpoint.failures && endpoint.failures > 0) {
      console.info(`[LoadBalancer] Endpoint ${endpoint.address} recovered`);
      endpoint.failures = 0;
    }
  }
  async fetch<T = any>(
    path: string,
    options?: RequestInit,
    retries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    let attemptsLeft = retries;
    while (attemptsLeft > 0) {
      const endpoint = this.getNextEndpoint();
      if (!endpoint) {
        throw new Error('No available endpoints');
      }
      try {
        const url = `${endpoint.address}${path}`;
        this.recordRequest(endpoint.address);        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });
        if (response.status === 429) {          this.markFailure(endpoint, new Error('Rate limit exceeded'));
          attemptsLeft--;
          continue;
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        this.markSuccess(endpoint);
        return data;
      } catch (error: any) {
        lastError = error;
        this.markFailure(endpoint, error);
        attemptsLeft--;
        if (attemptsLeft > 0) {          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    throw lastError || new Error('All endpoints failed');
  }
  async healthCheck(): Promise<void> {    const checks = this.endpoints.map(async (endpoint) => {
      const start = Date.now();
      try {
        const response = await fetch(`${endpoint.address}/cosmos/base/tendermint/v1beta1/node_info`, {
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - start;
        const healthy = response.ok;
        this.healthStatus.set(endpoint.address, {
          healthy,
          latency,
          lastCheck: Date.now(),
        });
        console.log(
          `[LoadBalancer] ${endpoint.provider} (${endpoint.address}): ` +
          `${healthy ? '✓' : '✗'} ${latency}ms`
        );
      } catch (error) {
        this.healthStatus.set(endpoint.address, {
          healthy: false,
          latency: -1,
          lastCheck: Date.now(),
        });
        console.error(`[LoadBalancer] ${endpoint.provider} health check failed`);
      }
    });
    await Promise.allSettled(checks);
  }
  getHealthStatus(): Map<string, EndpointHealth> {
    return this.healthStatus;
  }
  getStats() {
    return {
      endpoints: this.endpoints.map(ep => ({
        address: ep.address,
        provider: ep.provider,
        failures: ep.failures || 0,
        healthy: (ep.failures || 0) < this.MAX_FAILURES,
        health: this.healthStatus.get(ep.address),
      })),
      currentIndex: this.currentIndex,
    };
  }
}
const loadBalancers = new Map<string, { api: APILoadBalancer; rpc: APILoadBalancer }>();
export function getLoadBalancer(
  chainName: string,
  apiEndpoints: Endpoint[],
  rpcEndpoints: Endpoint[]
): { api: APILoadBalancer; rpc: APILoadBalancer } {
  if (!loadBalancers.has(chainName)) {
    loadBalancers.set(chainName, {
      api: new APILoadBalancer(apiEndpoints),
      rpc: new APILoadBalancer(rpcEndpoints),
    });
    const balancer = loadBalancers.get(chainName)!;
    balancer.api.healthCheck().catch(() => {});
    balancer.rpc.healthCheck().catch(() => {});
    setInterval(() => {
      balancer.api.healthCheck().catch(() => {});
      balancer.rpc.healthCheck().catch(() => {});
    }, 5 * 60 * 1000);
  }
  return loadBalancers.get(chainName)!;
}
export async function fetchFromAPI<T = any>(
  chainName: string,
  apiEndpoints: Endpoint[],
  path: string,
  options?: RequestInit
): Promise<T> {
  const balancer = getLoadBalancer(chainName, apiEndpoints, []);
  return balancer.api.fetch<T>(path, options);
}
export async function fetchFromRPC<T = any>(
  chainName: string,
  rpcEndpoints: Endpoint[],
  path: string,
  options?: RequestInit
): Promise<T> {
  const balancer = getLoadBalancer(chainName, [], rpcEndpoints);
  return balancer.rpc.fetch<T>(path, options);
}
export function getLoadBalancerStats(chainName: string) {
  const balancer = loadBalancers.get(chainName);
  if (!balancer) return null;
  return {
    api: balancer.api.getStats(),
    rpc: balancer.rpc.getStats(),
  };
}
export function clearLoadBalancer(chainName: string): void {  loadBalancers.delete(chainName);
}
