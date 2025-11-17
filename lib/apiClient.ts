export async function fetchAPI(endpoint: string, params?: Record<string, string>) {
  const url = new URL('/api/proxy', window.location.origin);
  url.searchParams.append('endpoint', endpoint);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}
export async function fetchChains() {
  return fetchAPI('/api/chains');
}
export async function fetchValidators(chain: string) {
  return fetchAPI('/api/validators', { chain });
}
export async function fetchBlocks(chain: string, limit?: string) {
  return fetchAPI('/api/blocks', { chain, ...(limit && { limit }) });
}
export async function fetchTransactions(chain: string, limit?: string, address?: string) {
  const params: Record<string, string> = { chain };
  if (limit) params.limit = limit;
  if (address) params.address = address;
  return fetchAPI('/api/transactions', params);
}
export async function fetchNetwork(chain: string) {
  return fetchAPI('/api/network', { chain });
}
export async function fetchProposals(chain: string) {
  return fetchAPI('/api/proposals', { chain });
}
export async function fetchProposal(chain: string, id: string) {
  return fetchAPI('/api/proposal', { chain, id });
}
export async function fetchAssets(chain: string, limit?: string) {
  return fetchAPI('/api/assets', { chain, ...(limit && { limit }) });
}
export async function fetchAssetDetail(chain: string, denom: string) {
  return fetchAPI('/api/asset-detail', { chain, denom });
}
export async function fetchAccounts(chain: string, address: string) {
  return fetchAPI('/api/accounts', { chain, address });
}
export async function fetchUptime(chain: string, blocks?: string) {
  return fetchAPI('/api/uptime', { chain, ...(blocks && { blocks }) });
}
export async function fetchValidator(chain: string, address: string) {
  return fetchAPI('/api/validator', { chain, address });
}
export async function fetchValidatorTransactions(chain: string, address: string) {
  return fetchAPI('/api/validator-transactions', { chain, address });
}
export async function fetchValidatorDelegations(chain: string, address: string) {
  return fetchAPI('/api/validator-delegations', { chain, address });
}
export async function fetchTransaction(chain: string, hash: string) {
  return fetchAPI('/api/transaction', { chain, hash });
}
export async function fetchBlock(chain: string, height: string) {
  return fetchAPI('/api/block', { chain, height });
}
export async function fetchParameters(chain: string) {
  return fetchAPI('/api/parameters', { chain });
}
export async function fetchKeybase(identity: string) {
  return fetchAPI('/api/keybase', { identity });
}
