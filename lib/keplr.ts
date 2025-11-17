import { ChainData } from '@/types/chain';
export interface KeplrChainInfo {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  bip44: {
    coinType: number; // 118 for Cosmos, 60 for EVM
  };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: Array<{
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    coinGeckoId?: string;
  }>;
  feeCurrencies: Array<{
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    coinGeckoId?: string;
    gasPriceStep?: {
      low: number;
      average: number;
      high: number;
    };
  }>;
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
    coinGeckoId?: string;
  };
  features?: string[];
}
export interface KeplrAccount {
  address: string;
  algo: string;
  pubKey: Uint8Array;
  isNanoLedger: boolean;
}
export function convertChainToKeplr(chain: ChainData, coinType: 118 | 60 = 118): KeplrChainInfo {
  const prefix = chain.addr_prefix || 'cosmos';
  const primaryAsset = chain.assets?.[0];
  return {
    chainId: chain.chain_id || chain.chain_name,
    chainName: chain.chain_name,
    rpc: chain.rpc?.[0]?.address || '',
    rest: chain.api?.[0]?.address || '',
    bip44: {
      coinType: coinType,
    },
    bech32Config: {
      bech32PrefixAccAddr: prefix,
      bech32PrefixAccPub: `${prefix}pub`,
      bech32PrefixValAddr: `${prefix}valoper`,
      bech32PrefixValPub: `${prefix}valoperpub`,
      bech32PrefixConsAddr: `${prefix}valcons`,
      bech32PrefixConsPub: `${prefix}valconspub`,
    },
    currencies: primaryAsset ? [{
      coinDenom: primaryAsset.symbol,
      coinMinimalDenom: primaryAsset.base,
      coinDecimals: typeof primaryAsset.exponent === 'string' ? parseInt(primaryAsset.exponent) : primaryAsset.exponent,
      coinGeckoId: primaryAsset.coingecko_id,
    }] : [],
    feeCurrencies: primaryAsset ? [{
      coinDenom: primaryAsset.symbol,
      coinMinimalDenom: primaryAsset.base,
      coinDecimals: typeof primaryAsset.exponent === 'string' ? parseInt(primaryAsset.exponent) : primaryAsset.exponent,
      coinGeckoId: primaryAsset.coingecko_id,
      gasPriceStep: {
        low: parseFloat(chain.min_tx_fee || '0.01'),
        average: parseFloat(chain.min_tx_fee || '0.025') * 1.5,
        high: parseFloat(chain.min_tx_fee || '0.025') * 2,
      },
    }] : [],
    stakeCurrency: primaryAsset ? {
      coinDenom: primaryAsset.symbol,
      coinMinimalDenom: primaryAsset.base,
      coinDecimals: typeof primaryAsset.exponent === 'string' ? parseInt(primaryAsset.exponent) : primaryAsset.exponent,
      coinGeckoId: primaryAsset.coingecko_id,
    } : {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
    },
    features: coinType === 60 ? ['eth-address-gen', 'eth-key-sign'] : undefined,
  };
}
export function isKeplrInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.keplr;
}
export function getKeplr() {
  if (!isKeplrInstalled()) {
    throw new Error('Keplr extension is not installed. Please install it from https://www.keplr.app/');
  }
  return window.keplr!;
}
export async function suggestChain(chainInfo: KeplrChainInfo): Promise<void> {
  const keplr = getKeplr();
  try {
    await keplr.experimentalSuggestChain(chainInfo);
  } catch (error) {
    console.error('Failed to suggest chain to Keplr:', error);
    throw error;
  }
}
export async function connectKeplr(
  chain: ChainData, 
  coinType: 118 | 60 = 118
): Promise<KeplrAccount> {
  if (!isKeplrInstalled()) {
    throw new Error('Keplr extension is not installed');
  }
  const keplr = getKeplr();
  const chainInfo = convertChainToKeplr(chain, coinType);
  const chainId = chainInfo.chainId;
  try {
    try {
      await keplr.enable(chainId);
    } catch (enableError) {
      console.log('Chain not found, suggesting to Keplr...');
      await suggestChain(chainInfo);
      await keplr.enable(chainId);
    }
    const key = await keplr.getKey(chainId);
    return {
      address: key.bech32Address,
      algo: key.algo,
      pubKey: key.pubKey,
      isNanoLedger: key.isNanoLedger,
    };
  } catch (error) {
    console.error('Failed to connect to Keplr:', error);
    throw error;
  }
}
export function disconnectKeplr(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('keplr_account');
    localStorage.removeItem('keplr_chain_id');
    localStorage.removeItem('keplr_coin_type');
  }
}
export function saveKeplrAccount(account: KeplrAccount, chainId: string, coinType: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('keplr_account', JSON.stringify(account));
    localStorage.setItem('keplr_chain_id', chainId);
    localStorage.setItem('keplr_coin_type', coinType.toString());
  }
}
export function getSavedKeplrAccount(): { account: KeplrAccount; chainId: string; coinType: number } | null {
  if (typeof window !== 'undefined') {
    const accountStr = localStorage.getItem('keplr_account');
    const chainId = localStorage.getItem('keplr_chain_id');
    const coinTypeStr = localStorage.getItem('keplr_coin_type');
    if (accountStr && chainId && coinTypeStr) {
      return {
        account: JSON.parse(accountStr),
        chainId,
        coinType: parseInt(coinTypeStr),
      };
    }
  }
  return null;
}
export function onKeplrAccountChange(callback: (accounts: KeplrAccount[]) => void): void {
  if (typeof window !== 'undefined' && window.keplr) {
    window.addEventListener('keplr_keystorechange', async () => {
      const saved = getSavedKeplrAccount();
      if (saved) {
        try {
          const key = await window.keplr!.getKey(saved.chainId);
          callback([{
            address: key.bech32Address,
            algo: key.algo,
            pubKey: key.pubKey,
            isNanoLedger: key.isNanoLedger,
          }]);
        } catch (error) {
          console.error('Failed to get updated account:', error);
          callback([]);
        }
      }
    });
  }
}
declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getKey: (chainId: string) => Promise<{
        bech32Address: string;
        algo: string;
        pubKey: Uint8Array;
        isNanoLedger: boolean;
      }>;
      experimentalSuggestChain: (chainInfo: KeplrChainInfo) => Promise<void>;
    };
  }
}
