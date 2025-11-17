'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Link from 'next/link';
import { ChainData } from '@/types/chain';
import { Activity, Globe, Server, Zap, Database, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';

interface NetworkInfo {
  chainId: string;
  latestBlockHeight: string;
  latestBlockTime: string;
  earliestBlockHeight: string;
  earliestBlockTime: string;
  catchingUp: boolean;
  nodeInfo: {
    protocolVersion: string;
    network: string;
    version: string;
    moniker: string;
  };
  totalPeers: number;
  inboundPeers: number;
  outboundPeers: number;
}

export default function NetworkPage() {
  const params = useParams();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const cachedChains = sessionStorage.getItem('chains');
    
    if (cachedChains) {
      const data = JSON.parse(cachedChains);
      setChains(data);
      const chainName = params?.chain as string;
      const chain = chainName 
        ? data.find((c: ChainData) => c.chain_name.toLowerCase().replace(/\s+/g, '-') === chainName.toLowerCase())
        : data.find((c: ChainData) => c.chain_name === 'lumera-mainnet') || data[0];
      if (chain) setSelectedChain(chain);
    } else {
      fetch('/api/chains')
        .then(res => res.json())
        .then(data => {
          sessionStorage.setItem('chains', JSON.stringify(data));
          setChains(data);
          const chainName = params?.chain as string;
          const chain = chainName 
            ? data.find((c: ChainData) => c.chain_name.toLowerCase().replace(/\s+/g, '-') === chainName.toLowerCase())
            : data.find((c: ChainData) => c.chain_name === 'lumera-mainnet') || data[0];
          if (chain) setSelectedChain(chain);
        });
    }
  }, [params]);

  useEffect(() => {
    if (!selectedChain) return;
    
    const cacheKey = `network_${selectedChain.chain_name}`;
    const cacheTimeout = 30000; // 30 seconds

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        setNetworkInfo(data);
        setLoading(false);

        if (Date.now() - timestamp < cacheTimeout) {
          return;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    fetch(`/api/network?chain=${selectedChain.chain_id || selectedChain.chain_name}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        setNetworkInfo(data);
        setLoading(false);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
          console.warn('Cache write error:', e);
        }
      })
      .catch(err => {
        console.error('Error loading network info:', err);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeoutId));
  }, [selectedChain]);

  const chainPath = selectedChain?.chain_name.toLowerCase().replace(/\s+/g, '-') || '';

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1 flex flex-col">
        <Header chains={chains} selectedChain={selectedChain} onSelectChain={setSelectedChain} />

        <main className="flex-1 mt-16 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('network.title')}</h1>
              <p className="text-gray-400">
                {t('network.subtitle')} {selectedChain?.chain_name}
              </p>
            </div>
          </div>

          {networkInfo ? (
            <>
              {/* Network Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Globe className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">{t('network.chainId')}</p>
                      <p className="text-xl font-bold text-white">{networkInfo?.chainId || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">{t('network.status')}</p>
                      <p className="text-xl font-bold text-green-500">
                        {networkInfo?.catchingUp ? t('network.syncing') : t('network.active')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Server className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">{t('network.totalPeers')}</p>
                      <p className="text-xl font-bold text-white">{networkInfo?.totalPeers || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Node Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-500" />
                    {t('network.nodeInfo')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.moniker')}</p>
                      <p className="text-white">{networkInfo?.nodeInfo?.moniker || '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.version')}</p>
                      <p className="text-white font-mono">{networkInfo?.nodeInfo?.version || '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.protocolVersion')}</p>
                      <p className="text-white font-mono">{networkInfo?.nodeInfo?.protocolVersion || '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.network')}</p>
                      <p className="text-white font-mono">{networkInfo?.nodeInfo?.network || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    {t('network.blockchainStatus')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.latestBlockHeight')}</p>
                      <p className="text-white text-lg font-bold">{networkInfo?.latestBlockHeight ? parseInt(networkInfo.latestBlockHeight).toLocaleString() : '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.latestBlockTime')}</p>
                      <p className="text-white">{networkInfo?.latestBlockTime ? new Date(networkInfo.latestBlockTime).toLocaleString() : '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.earliestBlockHeight')}</p>
                      <p className="text-white">{networkInfo?.earliestBlockHeight ? parseInt(networkInfo.earliestBlockHeight).toLocaleString() : '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-1">{t('network.earliestBlockTime')}</p>
                      <p className="text-white">{networkInfo?.earliestBlockTime ? new Date(networkInfo.earliestBlockTime).toLocaleString() : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peer Information */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  {t('network.peerConnections')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm mb-2">{t('network.totalPeers')}</p>
                    <p className="text-3xl font-bold text-white">{networkInfo?.totalPeers || 0}</p>
                  </div>

                  <div className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm mb-2">{t('network.inboundPeers')}</p>
                    <p className="text-3xl font-bold text-green-500">{networkInfo?.inboundPeers || 0}</p>
                  </div>

                  <div className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm mb-2">{t('network.outboundPeers')}</p>
                    <p className="text-3xl font-bold text-blue-500">{networkInfo?.outboundPeers || 0}</p>
                  </div>
                </div>
              </div>

              {/* API Endpoints */}
              {selectedChain && (
                <div className="mt-6 bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    {t('network.apiEndpoints')}
                  </h2>

                  <div className="space-y-3">
                    {selectedChain.api?.map((api, index) => (
                      <div key={index} className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800">
                        <p className="text-gray-400 text-sm mb-1">{t('network.restApi')} - {api.provider}</p>
                        <a 
                          href={api.address} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline font-mono text-sm"
                        >
                          {api.address}
                        </a>
                      </div>
                    ))}

                    {selectedChain.rpc?.map((api, index) => (
                      <div key={index} className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800">
                        <p className="text-gray-400 text-sm mb-1">{t('network.rpc')} - {api.provider}</p>
                        <a 
                          href={api.address} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline font-mono text-sm"
                        >
                          {api.address}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-12 text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{t('network.noData')}</h3>
              <p className="text-gray-400">{t('network.noDataDesc')}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

