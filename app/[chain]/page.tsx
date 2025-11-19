'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChainData } from '@/types/chain';
import { Activity, Box, Users, TrendingUp } from 'lucide-react';
import TokenomicsChart from '@/components/TokenomicsChart';
import TransactionHistoryChart from '@/components/TransactionHistoryChart';
import VotingPowerChart from '@/components/VotingPowerChart';
import LatestBlocks from '@/components/LatestBlocks';
import LatestTransactions from '@/components/LatestTransactions';
import { getCacheKey, setCache as setCacheUtil, getStaleCache } from '@/lib/cacheUtils';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';
import { prefetchOnIdle } from '@/lib/prefetch';
import { fetchChainsWithCache } from '@/lib/chainsCache';

export default function ChainOverviewPage() {
  const params = useParams();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [validators, setValidators] = useState<any[]>([]);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState({
    network: false,
    blocks: false,
    validators: false,
    transactions: false
  });

  useEffect(() => {

    fetchChainsWithCache()
      .then(data => {
        setChains(data);
        const chainName = params?.chain as string;
        const chain = chainName 
          ? data.find((c: ChainData) => c.chain_name.toLowerCase().replace(/\s+/g, '-') === chainName.toLowerCase())
          : data.find((c: ChainData) => c.chain_name === 'lumera-mainnet') || data[0];
        if (chain) setSelectedChain(chain);
      })
      .catch(err => console.error('Error loading chains:', err));
  }, [params]);

  useEffect(() => {
    if (selectedChain) {
      const chainKey = `chain_data_${selectedChain.chain_name}`;
      const cacheTimeout = 30000;

      let hasAnyCache = false;
      
      try {
        const cachedNetwork = sessionStorage.getItem(`${chainKey}_network`);
        const cachedBlocks = sessionStorage.getItem(`${chainKey}_blocks`);
        const cachedValidators = sessionStorage.getItem(`${chainKey}_validators`);
        const cachedTransactions = sessionStorage.getItem(`${chainKey}_transactions`);
        
        if (cachedNetwork) {
          const { data } = JSON.parse(cachedNetwork);
          setStats({
            chainId: data.chainId || selectedChain.chain_name,
            latestBlock: data.latestBlockHeight || '0',
            blockTime: '~6s',
            peers: data.totalPeers || 0,
          });
          hasAnyCache = true;
        }
        if (cachedBlocks) {
          const { data } = JSON.parse(cachedBlocks);
          if (data && data.length > 0) {
            setBlocks(data);
            hasAnyCache = true;
          }
        }
        if (cachedValidators) {
          const { data } = JSON.parse(cachedValidators);
          if (data && data.length > 0) {
            setValidators(data);
            // Calculate total bonded from cached validators
            const totalBonded = data.reduce((sum: number, v: any) => 
              sum + (parseFloat(v.votingPower) || 0), 0
            ) / 1000000;
            setTotalSupply(totalBonded > 0 ? totalBonded : 1000000);
            hasAnyCache = true;
          }
        }
        if (cachedTransactions) {
          const { data } = JSON.parse(cachedTransactions);
          if (data && data.length > 0) {
            setTransactions(data);
            hasAnyCache = true;
          }
        }
      } catch (e) {
        console.warn('Error loading cache:', e);
      }
      
      setLoading(false);
      
      setLoading(false);
      
      setDataLoaded({
        network: false,
        blocks: false,
        validators: false,
        transactions: false
      });

      const getCache = (key: string) => {
        try {
          const cached = sessionStorage.getItem(key);
          if (!cached) return null;
          const { data } = JSON.parse(cached);
          return data;
        } catch {
          return null;
        }
      };

      const setCache = (key: string, data: any) => {
        try {
          sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {}
      };

      const fetchWithRetry = async (url: string, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetchApi(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
          } catch (err) {
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      };

      const loadNetwork = async () => {
        try {
          const data = await fetchWithRetry(`/api/network?chain=${selectedChain.chain_id || selectedChain.chain_name}`);
          setStats({
            chainId: data.chainId || selectedChain.chain_name,
            latestBlock: data.latestBlockHeight || '0',
            blockTime: '~6s',
            peers: data.totalPeers || 0,
          });
          setCache(`${chainKey}_network`, data);
          setDataLoaded(prev => ({ ...prev, network: true }));
        } catch (err) {
          setDataLoaded(prev => ({ ...prev, network: true }));
        }
      };

      const loadBlocks = async () => {
        try {
          const data = await fetchWithRetry(`/api/blocks?chain=${selectedChain.chain_id || selectedChain.chain_name}&limit=30`);
          setBlocks(data);
          setCache(`${chainKey}_blocks`, data);
          setDataLoaded(prev => ({ ...prev, blocks: true }));
        } catch (err) {
          setDataLoaded(prev => ({ ...prev, blocks: true }));
        }
      };

      const loadValidators = async () => {
        try {
          const response = await fetchWithRetry(`/api/validators?chain=${selectedChain.chain_id || selectedChain.chain_name}`);
          // API returns { validators: [...], total: number }
          const validatorsData = response.validators || response;
          
          console.log('Validators loaded:', validatorsData.length, 'validators');
          if (validatorsData.length > 0) {
            console.log('First validator sample:', validatorsData[0]);
          }
          
          setValidators(validatorsData);
          setCache(`${chainKey}_validators`, validatorsData);
          setDataLoaded(prev => ({ ...prev, validators: true }));
        } catch (err) {
          console.error('Error loading validators:', err);
          setDataLoaded(prev => ({ ...prev, validators: true }));
        }
      };

      const loadSupply = async () => {
        try {
          // Ambil total supply dari API bank/supply
          const supplyData = await fetchWithRetry(`/api/supply?chain=${selectedChain.chain_id || selectedChain.chain_name}`);
          if (supplyData && supplyData.totalSupply) {
            setTotalSupply(parseFloat(supplyData.totalSupply) / 1000000);
            console.log('Total supply loaded:', supplyData.totalSupply);
          }
        } catch (err) {
          console.error('Error loading supply:', err);
          // Fallback ke 1M jika gagal
          setTotalSupply(1000000);
        }
      };

      const loadTransactions = async () => {
        try {
          const data = await fetchWithRetry(`/api/transactions?chain=${selectedChain.chain_id || selectedChain.chain_name}&limit=20`);
          setTransactions(data);
          setCache(`${chainKey}_transactions`, data);
          setDataLoaded(prev => ({ ...prev, transactions: true }));
        } catch (err) {
          setDataLoaded(prev => ({ ...prev, transactions: true }));
        }
      };

      (async () => {

        const timeoutId = setTimeout(() => {
          console.warn('Loading timeout reached, forcing loading = false');
          setLoading(false);
        }, 10000); // 10 second max loading time
        
        try {
          await Promise.all([
            loadNetwork(),
            loadBlocks(),
            loadValidators(),
            loadSupply(),
            loadTransactions(),
          ]);
        } catch (err) {
          console.error('Error during data loading:', err);
        } finally {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      })();
    }
  }, [selectedChain]);

  useEffect(() => {
    if (!selectedChain) return;
    
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        const [blocksData, txData] = await Promise.all([
          fetch(`/api/blocks?chain=${selectedChain.chain_id || selectedChain.chain_name}&limit=30`).then(r => r.json()),
          fetch(`/api/transactions?chain=${selectedChain.chain_id || selectedChain.chain_name}&limit=10`).then(r => r.json())
        ]);
        setBlocks(blocksData);
        setTransactions(txData);
      } catch (err) {
        console.error('Refresh error:', err);
      } finally {
        setIsRefreshing(false);
      }
    };

    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  const chainPath = selectedChain?.chain_name.toLowerCase().replace(/\s+/g, '-') || '';
  const chainSymbol = selectedChain?.assets[0]?.symbol || 'TOKEN';

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1 flex flex-col">
        <Header chains={chains} selectedChain={selectedChain} onSelectChain={setSelectedChain} />

        <main className="flex-1 mt-16 p-6 overflow-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                {selectedChain && (
                  <img 
                    src={selectedChain.logo} 
                    alt={selectedChain.chain_name} 
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {selectedChain?.chain_name || t('common.loading')}
                  </h1>
                  <p className="text-gray-400">{t('overview.networkOverview')}</p>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-xs text-gray-400">
                  {isRefreshing ? t('overview.updating') : t('overview.live')}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">{t('overview.chainId')}</span>
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats?.chainId || selectedChain?.chain_name || t('common.loading')}
                  </p>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">{t('overview.latestBlock')}</span>
                    <Box className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    #{stats?.latestBlock && stats.latestBlock !== '0' 
                      ? parseInt(stats.latestBlock).toLocaleString() 
                      : blocks && blocks.length > 0 
                      ? parseInt(blocks[0].height).toLocaleString()
                      : t('common.loading')}
                  </p>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">{t('overview.blockTime')}</span>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats?.blockTime || '~6s'}</p>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">{t('overview.peers')}</span>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats?.peers !== undefined ? stats.peers : t('common.loading')}
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <TokenomicsChart 
                  bonded={validators && validators.length > 0 && totalSupply > 0
                    ? (validators.reduce((sum: number, v: any) => sum + (parseFloat(v.votingPower) || 0), 0) / 1000000).toFixed(2)
                    : "0"
                  }
                  totalSupply={totalSupply > 0 ? totalSupply.toFixed(2) : "1000000"}
                />
                <TransactionHistoryChart 
                  data={blocks && blocks.length > 0 
                    ? blocks.map((block: any) => ({
                        date: block.time ? new Date(block.time).toISOString() : new Date().toISOString(),
                        count: parseInt(block.txs || '0', 10)
                      }))
                    : undefined
                  }
                />
                <VotingPowerChart 
                  validators={validators && validators.length > 0 
                    ? (() => {
                        const totalVP = validators.reduce((sum: number, val: any) => sum + (parseFloat(val.votingPower) || 0), 0);
                        const sorted = validators
                          .map((v: any) => {
                            const vp = parseFloat(v.votingPower) || 0;
                            return {
                              name: v.moniker || v.address?.substring(0, 10) || 'Unknown',
                              votingPower: vp / 1000000,
                              percentage: totalVP > 0 ? (vp / totalVP) * 100 : 0,
                              rawVotingPower: vp
                            };
                          })
                          .sort((a, b) => b.rawVotingPower - a.rawVotingPower);
                        
                        // Ambil top 10 dan sisanya jadi "Others"
                        const top10 = sorted.slice(0, 10);
                        const others = sorted.slice(10);
                        
                        if (others.length > 0) {
                          const othersVP = others.reduce((sum, v) => sum + v.votingPower, 0);
                          const othersPercentage = others.reduce((sum, v) => sum + v.percentage, 0);
                          top10.push({
                            name: 'Others',
                            votingPower: othersVP,
                            percentage: othersPercentage,
                            rawVotingPower: othersVP * 1000000
                          });
                        }
                        
                        return top10;
                      })()
                    : []
                  }
                />
              </div>

              {/* Latest Blocks & Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LatestBlocks blocks={blocks} chainName={selectedChain?.chain_name || ''} />
                <LatestTransactions transactions={transactions} chainName={selectedChain?.chain_name || ''} asset={selectedChain?.assets[0]} />
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

