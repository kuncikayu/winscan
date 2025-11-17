'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Link from 'next/link';
import { ChainData, TransactionData } from '@/types/chain';
import { Users, Search, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, DollarSign, Copy, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';
import { getSavedKeplrAccount } from '@/lib/keplr';
import { formatDistanceToNow } from 'date-fns';
import ValidatorAvatar from '@/components/ValidatorAvatar';

interface Account {
  address: string;
  balance: {
    denom: string;
    amount: string;
  }[];
}

interface Balance {
  denom: string;
  amount: string;
}

interface Delegation {
  validator: string;
  amount: string;
  validatorInfo?: {
    moniker: string;
    identity?: string;
    operatorAddress: string;
  };
}

interface Reward {
  validator: string;
  amount: string;
}

interface WalletData {
  address: string;
  isValidator?: boolean;
  balances: Balance[];
  delegations: Delegation[];
  rewards: Reward[];
  transactions: TransactionData[];
  commission?: {
    total: string;
    breakdown: any[];
  } | null;
}

export default function AccountsPage() {
  const params = useParams();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/chains')
      .then(res => res.json())
      .then(data => {
        setChains(data);
        const chainName = params?.chain as string;
        const chain = chainName 
          ? data.find((c: ChainData) => c.chain_name.toLowerCase().replace(/\s+/g, '-') === chainName.toLowerCase())
          : data.find((c: ChainData) => c.chain_name === 'lumera-mainnet') || data[0];
        if (chain) setSelectedChain(chain);
      });
  }, [params]);

  useEffect(() => {
    const checkWallet = () => {
      const saved = getSavedKeplrAccount();
      if (saved && saved.account) {
        setConnectedAddress(saved.account.address);
      } else {
        setConnectedAddress(null);
        setWalletData(null);
      }
    };

    checkWallet();

    const handleStorageChange = () => checkWallet();
    window.addEventListener('storage', handleStorageChange);

    const handleWalletChange = () => checkWallet();
    window.addEventListener('keplr_wallet_changed', handleWalletChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('keplr_wallet_changed', handleWalletChange);
    };
  }, []);

  useEffect(() => {
    if (!connectedAddress || !selectedChain) return;

    setLoading(true);

    fetch(`/api/accounts?chain=${selectedChain.chain_id || selectedChain.chain_name}&address=${connectedAddress}`)
      .then(r => r.json())
      .then(data => {
        console.log('Account data:', data); // Debug
        setWalletData({
          address: connectedAddress,
          balances: data.balances || [],
          delegations: data.delegations || [],
          rewards: data.rewards || [],
          transactions: data.transactions || [],
        });
      })
      .catch(err => {
        console.error('Failed to fetch account data:', err);
        setWalletData({
          address: connectedAddress,
          balances: [],
          delegations: [],
          rewards: [],
          transactions: [],
        });
      })
      .finally(() => setLoading(false));
  }, [connectedAddress, selectedChain]);

  const chainPath = selectedChain?.chain_name.toLowerCase().replace(/\s+/g, '-') || '';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      window.location.href = `/${chainPath}/accounts/${searchAddress.trim()}`;
    }
  };

  const copyAddress = () => {
    if (connectedAddress) {
      navigator.clipboard.writeText(connectedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAmount = (amount: string, exponent: number = 6) => {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount === 0) return '0';
      const value = numAmount / Math.pow(10, exponent);
      return value.toLocaleString('en-US', { 
        maximumFractionDigits: 6,
        minimumFractionDigits: 0
      });
    } catch (err) {
      console.error('Error formatting amount:', err, amount);
      return '0';
    }
  };

  const getTotalDelegated = () => {
    if (!walletData?.delegations || walletData.delegations.length === 0) return '0';
    try {
      const total = walletData.delegations.reduce((sum, del) => {
        const amount = parseFloat(del.amount || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      return formatAmount(total.toString());
    } catch (err) {
      console.error('Error calculating total delegated:', err);
      return '0';
    }
  };

  const getTotalRewards = () => {
    if (!walletData?.rewards || walletData.rewards.length === 0) return '0';
    try {
      const total = walletData.rewards.reduce((sum, rew) => {
        const amount = parseFloat(rew.amount || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      return formatAmount(total.toString());
    } catch (err) {
      console.error('Error calculating total rewards:', err);
      return '0';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1 flex flex-col">
        <Header chains={chains} selectedChain={selectedChain} onSelectChain={setSelectedChain} />

        <main className="flex-1 mt-16 p-6 overflow-auto">
          <div className="flex items-center text-sm text-gray-400 mb-6">
            <Link href={`/${chainPath}`} className="hover:text-blue-500">{t('overview.title')}</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{t('accounts.title')}</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-6">{t('accounts.title')}</h1>

          {/* Connected Wallet Section */}
          {connectedAddress && walletData ? (
            <div className="space-y-6">
              {/* Wallet Address Card */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    My Wallet
                  </h2>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Copy Address</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="text-blue-400 font-mono text-sm break-all">
                  {connectedAddress}
                </code>
              </div>

              {/* Balance Stats */}
              <div className={`grid grid-cols-1 ${walletData.isValidator ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                {/* Available Balance */}
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Available Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : walletData.balances[0] 
                      ? formatAmount(walletData.balances[0].amount) 
                      : '0'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedChain?.assets?.[0]?.symbol || 'Token'}
                  </p>
                </div>

                {/* Total Delegated */}
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Total Delegated</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : getTotalDelegated()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {walletData.delegations.length} validator(s)
                  </p>
                </div>

                {/* Pending Rewards */}
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm">Pending Rewards</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {loading ? '...' : getTotalRewards()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedChain?.assets?.[0]?.symbol || 'Token'}
                  </p>
                </div>

                {/* Validator Commission (only if validator) */}
                {walletData.isValidator && walletData.commission && (
                  <div className="bg-[#1a1a1a] border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Commission Earned</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">
                      {loading ? '...' : formatAmount(walletData.commission.total)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="text-purple-400">Validator</span> • {selectedChain?.assets?.[0]?.symbol || 'Token'}
                    </p>
                  </div>
                )}
              </div>

              {/* My Delegations */}
              {walletData.delegations.length > 0 && (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      My Delegations ({walletData.delegations.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0f0f0f]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Validator</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {walletData.delegations.map((delegation, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {delegation.validatorInfo && (
                                  <ValidatorAvatar 
                                    identity={delegation.validatorInfo.identity}
                                    moniker={delegation.validatorInfo.moniker}
                                    size="sm"
                                  />
                                )}
                                  <div>
                                  <div className="text-white font-medium">
                                    {delegation.validatorInfo?.moniker || 'Unknown'}
                                  </div>
                                  <code className="text-xs text-gray-500">
                                    {delegation.validator?.slice(0, 20) || 'N/A'}...
                                  </code>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-white font-mono">
                                {delegation.amount ? formatAmount(delegation.amount) : '0'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {selectedChain?.assets?.[0]?.symbol || 'Token'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link
                                href={`/${chainPath}/validators/${delegation.validatorInfo?.operatorAddress || delegation.validator}`}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {walletData.transactions.length > 0 && (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ArrowDownLeft className="w-5 h-5" />
                      Recent Transactions ({walletData.transactions.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0f0f0f]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tx Hash</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {walletData.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <Link
                                href={`/${chainPath}/transactions/${tx.hash}`}
                                className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                              >
                                {tx.hash.slice(0, 16)}...
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-300 text-sm">
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-sm">
                              {formatDistanceToNow(new Date(tx.time), { addSuffix: true })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {tx.result?.toLowerCase() === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                              ) : (
                                <span className="text-red-400">Failed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-gray-800 text-center">
                    <Link
                      href={`/${chainPath}/accounts/${connectedAddress}`}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View All Transactions →
                    </Link>
                  </div>
                </div>
              )}

              {/* Empty State for No Delegations */}
              {!loading && walletData.delegations.length === 0 && (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Delegations</h3>
                  <p className="text-gray-400 text-sm">
                    You haven't delegated any tokens yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search Form (when not connected) */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder={t('accounts.searchPlaceholder')}
                  className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={!searchAddress.trim()}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-500/90 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {t('accounts.searchButton')}
              </button>
            </form>
          </div>

          {/* Info Card */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('accounts.searchTitle')}</h3>
            <p className="text-gray-400 mb-6">
              {t('accounts.searchDesc')}
            </p>
            <div className="text-left max-w-2xl mx-auto bg-[#0f0f0f] p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">{t('accounts.exampleAddresses')}</p>
              <div className="space-y-2">
                <div className="font-mono text-xs text-white break-all">
                  {selectedChain?.addr_prefix || 'cosmos'}1abc...xyz
                </div>
                <p className="text-xs text-gray-400">
                  {t('accounts.searchAny')} {selectedChain?.chain_name || 'chain'} {t('accounts.network')}
                </p>
              </div>
            </div>
          </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

