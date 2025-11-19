/**
 * Client-side Cosmos LCD client
 * Fetches directly from LCD endpoints to bypass server IP blocks
 */

export interface LCDEndpoint {
  address: string;
  provider: string;
}

export interface ValidatorResponse {
  validators: any[];
  pagination?: {
    next_key: string | null;
    total?: string;
  };
}

/**
 * Fetch validators directly from LCD endpoint (client-side)
 * Uses browser's fetch API to bypass server IP blocking
 */
export async function fetchValidatorsDirectly(
  endpoints: LCDEndpoint[],
  status: string = 'BOND_STATUS_BONDED',
  limit: number = 300
): Promise<any[]> {
  const errors: string[] = [];
  
  // Try each endpoint until one succeeds
  for (const endpoint of endpoints) {
    try {
      console.log(`[CosmosClient] Trying ${endpoint.provider}: ${endpoint.address}`);
      
      const url = `${endpoint.address}/cosmos/staking/v1beta1/validators?status=${status}&pagination.limit=${limit}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        // Use 'cors' mode to allow cross-origin requests
        mode: 'cors',
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        errors.push(`${endpoint.provider}: HTTP ${response.status}`);
        continue;
      }
      
      const data: ValidatorResponse = await response.json();
      
      if (!data.validators || data.validators.length === 0) {
        errors.push(`${endpoint.provider}: Empty response`);
        continue;
      }
      
      console.log(`[CosmosClient] ✓ Success from ${endpoint.provider} (${data.validators.length} validators)`);
      return data.validators;
      
    } catch (error: any) {
      errors.push(`${endpoint.provider}: ${error.message}`);
      continue;
    }
  }
  
  // All endpoints failed
  throw new Error(`All LCD endpoints failed:\n${errors.join('\n')}`);
}

/**
 * Fetch proposals directly from LCD endpoint (client-side)
 */
export async function fetchProposalsDirectly(
  endpoints: LCDEndpoint[],
  status: string = 'PROPOSAL_STATUS_VOTING_PERIOD',
  limit: number = 100
): Promise<any[]> {
  const errors: string[] = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`[CosmosClient] Trying ${endpoint.provider}: ${endpoint.address}`);
      
      const url = `${endpoint.address}/cosmos/gov/v1beta1/proposals?proposal_status=${status}&pagination.limit=${limit}&pagination.reverse=true`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        errors.push(`${endpoint.provider}: HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (!data.proposals) {
        errors.push(`${endpoint.provider}: No proposals field`);
        continue;
      }
      
      console.log(`[CosmosClient] ✓ Success from ${endpoint.provider} (${data.proposals.length} proposals)`);
      return data.proposals;
      
    } catch (error: any) {
      errors.push(`${endpoint.provider}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error(`All LCD endpoints failed:\n${errors.join('\n')}`);
}

/**
 * Check if a chain should use direct LCD fetch (rate limited chains)
 * Enable for ALL chains to bypass server IP blocks universally
 */
export function shouldUseDirectFetch(chainName: string): boolean {
  // Use client-side fetch for ALL chains
  // This bypasses rate limiting and IP blocks universally
  // Server API is kept as fallback for better performance when it works
  return true;
}
