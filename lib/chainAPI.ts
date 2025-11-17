import axios from 'axios';
import { BlockData, TransactionData, ValidatorData, ChainStats } from '@/types/chain';
import crypto from 'crypto';
export class ChainAPI {
  private apiUrl: string;
  private rpcUrl: string;
  constructor(apiUrl: string, rpcUrl: string) {
    this.apiUrl = apiUrl;
    this.rpcUrl = rpcUrl;
  }
  async getLatestBlocks(limit: number = 10): Promise<BlockData[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`);
      const latestHeight = parseInt(response.data.block.header.height);
      const blocks: BlockData[] = [];
      for (let i = 0; i < limit; i++) {
        try {
          const blockResponse = await axios.get(
            `${this.apiUrl}/cosmos/base/tendermint/v1beta1/blocks/${latestHeight - i}`
          );
          const block = blockResponse.data.block;
          blocks.push({
            height: parseInt(block.header.height),
            hash: block.header.last_commit_hash || block.header.hash,
            time: block.header.time,
            txs: block.data?.txs?.length || 0,
            proposer: block.header.proposer_address,
          });
        } catch (error) {
          console.error(`Error fetching block ${latestHeight - i}:`, error);
        }
      }
      return blocks;
    } catch (error) {
      console.error('Error fetching latest blocks:', error);
      return [];
    }
  }
  async getLatestTransactions(limit: number = 10): Promise<TransactionData[]> {
    try {
      const latestBlockResponse = await axios.get(
        `${this.apiUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`,
        { timeout: 5000 }
      );
      const latestHeight = parseInt(latestBlockResponse.data?.block?.header?.height || '0');
      if (!latestHeight) {
        return this.getTransactionsFromBlocks(limit);
      }
      const searchHeight = latestHeight - 100; // Search last 100 blocks
      try {
        const response = await axios.get(
          `${this.apiUrl}/cosmos/tx/v1beta1/txs?events=tx.height>${searchHeight}&pagination.limit=${limit}&order_by=2`,
          { timeout: 10000 }
        );
        const txResponses = response.data?.tx_responses || [];
        const txs = response.data?.txs || [];
        console.log(`Found ${txResponses.length} transactions from API using height query`);
        if (txResponses.length === 0) {
          return this.getTransactionsFromBlocks(limit);
        }
        const transactions: TransactionData[] = [];
        for (let i = 0; i < Math.min(txResponses.length, limit); i++) {
          const txResponse = txResponses[i];
          const tx = txs[i];
          const messageType = tx?.body?.messages?.[0]?.['@type'] || '';
          const action = messageType.split('.').pop() || 'Transaction';
          const feeAmount = tx?.auth_info?.fee?.amount?.[0]?.amount || '0';
          const feeDenom = tx?.auth_info?.fee?.amount?.[0]?.denom || '';
          transactions.push({
            hash: txResponse.txhash || `tx-${i}`,
            type: action,
            result: txResponse.code === 0 ? 'Success' : 'Failed',
            fee: `${feeAmount} ${feeDenom}`,
            height: parseInt(txResponse.height || '0'),
            time: txResponse.timestamp || new Date().toISOString(),
          });
        }
        return transactions;
      } catch (searchError) {
        console.error('Failed to fetch from txs endpoint with height query:', searchError);
        return this.getTransactionsFromBlocks(limit);
      }
    } catch (error) {
      console.error('Failed to get latest block:', error);
      return this.getTransactionsFromBlocks(limit);
    }
  }
  private async getTransactionsFromBlocks(limit: number): Promise<TransactionData[]> {
    try {
      const latestBlock = await axios.get(`${this.apiUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`, {
        timeout: 5000
      });
      const latestHeight = parseInt(latestBlock.data?.block?.header?.height || '0');
      if (!latestHeight) {
        return [];
      }
      console.log(`Fetching transactions from recent blocks starting at height ${latestHeight}...`);
      const transactions: TransactionData[] = [];
      const blocksToFetch = 20;
      for (let i = 0; i < blocksToFetch; i++) {
        const currentHeight = latestHeight - i;
        try {
          const block = await axios.get(
            `${this.apiUrl}/cosmos/base/tendermint/v1beta1/blocks/${currentHeight}`,
            { timeout: 3000 }
          );
          const blockData = block.data?.block;
          const blockTime = blockData?.header?.time || new Date().toISOString();
          const txsData = blockData?.data?.txs || [];
          console.log(`Block ${currentHeight}: ${txsData.length} transactions`);
          if (txsData.length > 0) {
            for (let j = 0; j < txsData.length && transactions.length < limit; j++) {
              const txBytes = Buffer.from(txsData[j], 'base64');
              const txHash = crypto.createHash('sha256').update(txBytes).digest('hex').toUpperCase();
              transactions.push({
                hash: txHash,
                type: 'Transaction',
                result: 'Success',
                fee: '0',
                height: currentHeight,
                time: blockTime,
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching block ${currentHeight}`);
        }
        if (transactions.length >= limit) {
          break;
        }
      }
      console.log(`Found ${transactions.length} transactions`);
      return transactions.slice(0, limit);
    } catch (error) {
      console.error('Transaction fetch from blocks failed:', error);
      return [];
    }
  }
  async getChainStats(): Promise<ChainStats> {
    try {
      const [stakingPool, supply, inflation, validators, latestBlock] = await Promise.all([
        axios.get(`${this.apiUrl}/cosmos/staking/v1beta1/pool`).catch(() => null),
        axios.get(`${this.apiUrl}/cosmos/bank/v1beta1/supply`).catch(() => null),
        axios.get(`${this.apiUrl}/cosmos/mint/v1beta1/inflation`).catch(() => null),
        axios.get(`${this.apiUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED`).catch(() => null),
        axios.get(`${this.apiUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`).catch(() => null),
      ]);
      const bondedTokens = stakingPool?.data?.pool?.bonded_tokens || '0';
      const unbondedTokens = stakingPool?.data?.pool?.not_bonded_tokens || '0';
      const totalSupply = supply?.data?.supply?.[0]?.amount || '0';
      const inflationRate = inflation?.data?.inflation || '0';
      const activeVals = validators?.data?.validators?.length || 0;
      const latestHeight = parseInt(latestBlock?.data?.block?.header?.height || '0');
      return {
        marketCap: '0',
        inflation: parseFloat(inflationRate).toFixed(2),
        apr: '0',
        supply: totalSupply,
        communityPool: '0',
        avgBlockTime: '6.00',
        activeValidators: activeVals,
        totalValidators: activeVals,
        latestBlock: latestHeight,
        bondedTokens,
        unbondedTokens,
      };
    } catch (error) {
      console.error('Error fetching chain stats:', error);
      return {
        marketCap: '0',
        inflation: '0',
        apr: '0',
        supply: '0',
        communityPool: '0',
        avgBlockTime: '0',
        activeValidators: 0,
        totalValidators: 0,
        latestBlock: 0,
        bondedTokens: '0',
        unbondedTokens: '0',
      };
    }
  }
  async getValidators(limit: number = 50): Promise<ValidatorData[]> {
    try {
      const [bondedResponse, unbondedResponse, unbondingResponse] = await Promise.all([
        axios.get(`${this.apiUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=${limit}`).catch(() => ({ data: { validators: [] } })),
        axios.get(`${this.apiUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_UNBONDED&pagination.limit=${limit}`).catch(() => ({ data: { validators: [] } })),
        axios.get(`${this.apiUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_UNBONDING&pagination.limit=${limit}`).catch(() => ({ data: { validators: [] } }))
      ]);
      const allValidators = [
        ...(bondedResponse.data.validators || []),
        ...(unbondedResponse.data.validators || []),
        ...(unbondingResponse.data.validators || [])
      ];
      const validators = allValidators.map((val: any) => ({
        address: val.operator_address,
        moniker: val.description?.moniker || 'Unknown',
        votingPower: val.tokens || '0',
        commission: val.commission?.commission_rates?.rate || '0',
        status: val.status || 'BOND_STATUS_UNKNOWN',
        jailed: val.jailed || false
      }));
      validators.sort((a, b) => {
        const aActive = a.status === 'BOND_STATUS_BONDED' && !a.jailed;
        const bActive = b.status === 'BOND_STATUS_BONDED' && !b.jailed;
        if (aActive && bActive) {
          return parseInt(b.votingPower) - parseInt(a.votingPower);
        }
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return parseInt(b.votingPower) - parseInt(a.votingPower);
      });
      return validators;
    } catch (error) {
      console.error('Error fetching validators:', error);
      return [];
    }
  }
}
