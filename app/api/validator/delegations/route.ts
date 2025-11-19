import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ChainData {
  chain_name: string;
  chain_id?: string;
  api?: Array<{ address: string; provider?: string }>;
}

// Load chains data from JSON files
function loadChainsData(): ChainData[] {
  const chainsDir = path.join(process.cwd(), 'Chains');
  const files = fs.readdirSync(chainsDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(chainsDir, file), 'utf-8');
    return JSON.parse(content);
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const address = searchParams.get('address');

    if (!chain || !address) {
      return NextResponse.json({ error: 'Chain and address parameters required' }, { status: 400 });
    }

    // Find chain config
    const chainsData = loadChainsData();
    const chainConfig = chainsData.find((c: ChainData) => 
      c.chain_name === chain || 
      c.chain_id === chain ||
      c.chain_name.toLowerCase().replace(/\s+/g, '-') === chain.toLowerCase()
    );

    if (!chainConfig) {
      return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
    }

    const lcdEndpoints = chainConfig.api || [];
    const chainPath = chainConfig.chain_name.toLowerCase().replace(/\s+/g, '-');

    let delegations: any[] = [];
    let unbonding: any[] = [];

    // Try LCD endpoints first
    if (lcdEndpoints.length > 0) {
      for (const endpoint of lcdEndpoints) {
        try {
          console.log(`[Delegations] Trying ${endpoint.provider} for validator ${address}`);

          // Fetch delegations
          const delegationsUrl = `${endpoint.address}/cosmos/staking/v1beta1/validators/${address}/delegations?pagination.limit=1000`;
          const delegationsResponse = await fetch(delegationsUrl, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
          });

          if (delegationsResponse.ok) {
            const delegationsData = await delegationsResponse.json();
            delegations = (delegationsData.delegation_responses || []).map((d: any) => ({
              delegator: d.delegation?.delegator_address || '',
              shares: d.delegation?.shares || '0',
              balance: d.balance?.amount || '0'
            }));
            console.log(`[Delegations] ✓ Got ${delegations.length} delegations from ${endpoint.provider}`);
          }

          // Fetch unbonding delegations
          const unbondingUrl = `${endpoint.address}/cosmos/staking/v1beta1/validators/${address}/unbonding_delegations?pagination.limit=1000`;
          const unbondingResponse = await fetch(unbondingUrl, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
          });

          if (unbondingResponse.ok) {
            const unbondingData = await unbondingResponse.json();
            unbonding = (unbondingData.unbonding_responses || []).map((u: any) => ({
              delegator: u.delegator_address || '',
              entries: (u.entries || []).map((e: any) => ({
                balance: e.balance || '0',
                completionTime: e.completion_time || ''
              }))
            }));
            console.log(`[Delegations] ✓ Got ${unbonding.length} unbonding from ${endpoint.provider}`);
          }

          // If we got data, return it
          if (delegations.length > 0 || unbonding.length > 0) {
            return NextResponse.json({
              delegations,
              unbonding,
              source: endpoint.provider
            });
          }

        } catch (error: any) {
          console.error(`${endpoint.provider}: ${error.message}`);
          continue;
        }
      }
    }

    // Smart fallback: Try ssl.winsnip.xyz if LCD failed
    try {
      console.log(`[Delegations] LCD failed, trying ssl.winsnip.xyz fallback for ${chainPath}`);
      
      const fallbackUrl = `https://ssl.winsnip.xyz/api/validator/delegations?chain=${chainPath}&address=${address}`;
      const response = await fetch(fallbackUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Delegations] ✓ Fallback success from ssl.winsnip.xyz`);
        return NextResponse.json({
          delegations: data.delegations || [],
          unbonding: data.unbonding || [],
          source: 'ssl.winsnip.xyz'
        });
      }
    } catch (fallbackError) {
      console.error('[Delegations] Fallback also failed:', fallbackError);
    }

    // Return empty arrays if everything fails
    return NextResponse.json({
      delegations: [],
      unbonding: [],
      source: 'none'
    });

  } catch (error: any) {
    console.error('Error fetching delegations:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch delegations', details: error.message },
      { status: 500 }
    );
  }
}
