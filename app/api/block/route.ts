import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const API_URL = process.env.API_URL || 'https://ssl.winsnip.xyz';
function pubkeyToAddress(pubkeyBase64: string): string {
  try {
    const pubkeyBytes = Buffer.from(pubkeyBase64, 'base64');
    const hash = crypto.createHash('sha256').update(pubkeyBytes).digest();
    return hash.slice(0, 20).toString('hex').toUpperCase();
  } catch (e) {
    return '';
  }
}
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get('chain');
    const height = searchParams.get('height');
    if (!chainId || !height) {
      return NextResponse.json(
        { error: 'Chain and height parameters required' },
        { status: 400 }
      );
    }
    const chainsDir = path.join(process.cwd(), 'Chains');
    const chainFilePath = path.join(chainsDir, `${chainId}.json`);
    if (!fs.existsSync(chainFilePath)) {
      console.error(`Chain file not found: ${chainFilePath}`);
      return NextResponse.json(
        { error: 'Chain configuration not found' },
        { status: 404 }
      );
    }
    const chainData = JSON.parse(fs.readFileSync(chainFilePath, 'utf-8'));
    const rpcUrl = chainData.rpc?.[0]?.address;
    const apiUrl = chainData.api?.[0]?.address;
    if (!rpcUrl) {
      return NextResponse.json(
        { error: 'No RPC URL configured for this chain' },
        { status: 500 }
      );
    }
    const blockResponse = await fetch(`${rpcUrl}/block?height=${height}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 }
    });
    if (!blockResponse.ok) {
      console.error('RPC block fetch error:', blockResponse.status);
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }
    const rpcData = await blockResponse.json();
    const blockData = rpcData.result;
    let proposerMoniker = 'Unknown';
    let proposerIdentity: string | undefined;
    let proposerAddress: string | undefined;
    const proposerConsensusAddress = blockData.block.header.proposer_address;
    if (apiUrl) {
      try {
        const validatorsResponse = await fetch(
          `${apiUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300`,
          { headers: { 'Accept': 'application/json' }, next: { revalidate: 30 } }
        );
        if (validatorsResponse.ok) {
          const validatorsData = await validatorsResponse.json();
          const validator = validatorsData.validators?.find((v: any) => {
            if (!v.consensus_pubkey?.key) return false;
            const calculatedAddress = pubkeyToAddress(v.consensus_pubkey.key);
            return calculatedAddress === proposerConsensusAddress;
          });
          if (validator) {
            proposerMoniker = validator.description?.moniker || 'Unknown';
            proposerIdentity = validator.description?.identity;
            proposerAddress = validator.operator_address;
          }
        }
      } catch (e) {
        console.error('Failed to fetch validator info:', e);
      }
    }
    const transactions = [];
    const txCount = blockData.block.data.txs?.length || 0;
    if (txCount > 0 && apiUrl) {
      try {
        const txResponse = await fetch(
          `${apiUrl}/cosmos/tx/v1beta1/txs?events=tx.height=${height}`,
          { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } }
        );
        if (txResponse.ok) {
          const txData = await txResponse.json();
          const txs = txData.tx_responses || [];
          transactions.push(...txs.map((tx: any) => ({
            hash: tx.txhash,
            type: tx.tx?.body?.messages?.[0]?.['@type']?.split('.').pop() || 'Transaction',
            result: tx.code === 0 ? 'Success' : 'Failed',
          })));
        }
      } catch (e) {
        console.error('Failed to fetch transactions:', e);
      }
    }
    const blockDetail = {
      height: parseInt(blockData.block.header.height),
      hash: blockData.block_id.hash,
      time: blockData.block.header.time,
      txs: txCount,
      proposer: blockData.block.header.proposer_address,
      proposerMoniker,
      proposerIdentity,
      proposerAddress,
      gasUsed: 'N/A',
      gasWanted: 'N/A',
      transactions,
    };
    return NextResponse.json(blockDetail, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error: any) {
    console.error('Block API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
