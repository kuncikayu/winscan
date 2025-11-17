'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ValidatorAvatar from '@/components/ValidatorAvatar';
import { ChainData } from '@/types/chain';
import { Activity, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';

interface ValidatorUptime {
  rank?: number; // Nomor urut
  moniker: string;
  operator_address: string;
  consensus_address: string;
  identity: string;
  uptime: number;
  missedBlocks: number;
  signedBlocks: number;
  missedBlocksIn100?: number;
  signedBlocksTotal?: number;
  signingWindow?: number;
  maxMissedBlocks?: number;
  jailed: boolean;
  jailedUntil?: string | null;
  tombstoned?: boolean;
  willBeJailed?: boolean;
  status: string;
  votingPower: string;
  blockSignatures: boolean[];
}

export default function UptimePage() {
  const params = useParams();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [uptimeData, setUptimeData] = useState<ValidatorUptime[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [blocksToCheck, setBlocksToCheck] = useState(100);

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
    
    const fetchUptime = async () => {
      const cacheKey = `uptime_v3_${selectedChain.chain_name}_${blocksToCheck}`;
      
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Array.isArray(data)) {
            setUptimeData(data);
          }
          
          if (Date.now() - timestamp < 10000) {
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Cache read error:', e);
      }
      
      if (uptimeData.length === 0) {
        setLoading(true);
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch(
          `/api/uptime?chain=${selectedChain.chain_id || selectedChain.chain_name}&blocks=${blocksToCheck}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setUptimeData(data);
          
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ 
              data, 
              timestamp: Date.now() 
            }));
            
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('uptime_') && !key.startsWith('uptime_v3_')) {
                sessionStorage.removeItem(key);
              }
            });
          } catch (e) {
            console.warn('Cache write error:', e);
          }
        } else {
          console.error('Invalid data format:', data);
          setUptimeData([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('Uptime request timeout');
        } else {
          console.error('Error loading uptime:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchUptime();
    
    const interval = setInterval(fetchUptime, 6000);
    
    return () => {
      clearInterval(interval);
    };
  }, [selectedChain, blocksToCheck]);

  const validUptimeData = Array.isArray(uptimeData) ? uptimeData : [];
  
  const filteredValidators = validUptimeData.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.moniker.toLowerCase().includes(query) ||
      v.operator_address.toLowerCase().includes(query)
    );
  });

  const chainPath = selectedChain?.chain_name.toLowerCase().replace(/\s+/g, '-') || '';

  const sortedValidators = [...filteredValidators].sort((a, b) => {
    if (a.status === 'BOND_STATUS_BONDED' && b.status !== 'BOND_STATUS_BONDED') return -1;
    if (a.status !== 'BOND_STATUS_BONDED' && b.status === 'BOND_STATUS_BONDED') return 1;
    
    const powerA = parseFloat(a.votingPower || '0');
    const powerB = parseFloat(b.votingPower || '0');
    return powerB - powerA;
  });

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-green-500';
    if (uptime >= 95) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getUptimeBgColor = (uptime: number) => {
    if (uptime >= 99) return 'bg-green-500/10 border-green-500/20';
    if (uptime >= 95) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scaleY(1);
          }
          50% {
            opacity: 0.7;
            transform: scaleY(0.95);
          }
        }
        @keyframes slideInFromRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideBlocks {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 197, 94, 1);
          }
        }
        .blocks-container {
          display: flex;
          gap: 2px;
          width: 200%;
        }
        .blocks-wrapper {
          display: flex;
          gap: 2px;
          flex: 1;
        }
        .blocks-wrapper.animated {
          animation: slideBlocks 300s linear infinite;
        }
        @keyframes fillUp {
          from {
            transform: scaleX(0);
            opacity: 0.5;
          }
          to {
            transform: scaleX(1);
            opacity: 1;
          }
        }
        .block-bar {
          animation: shiftLeft 0.6s ease-out;
        }
        .block-bar-new {
          animation: slideInFromRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: right;
        }
        .block-bar-shift {
          transition: transform 0.6s ease-out;
        }
      `}</style>
      
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          chains={chains}
          selectedChain={selectedChain}
          onSelectChain={setSelectedChain}
        />

        <main className="flex-1 mt-16 p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-white">{t('uptime.title')}</h1>
            </div>
            <p className="text-gray-400">
              {t('uptime.subtitle')}
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder={t('uptime.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-gray-400">{t('uptime.totalValidators')} </span>
                <span className="text-white font-bold">{validUptimeData.length}</span>
              </div>
              {searchQuery && (
                <div className="text-sm">
                  <span className="text-gray-400">{t('uptime.filtered')} </span>
                  <span className="text-blue-400 font-bold">{filteredValidators.length}</span>
                </div>
              )}
            </div>
            
            {/* Auto-refresh indicator */}
            <div className="flex items-center gap-2">
              {loading && uptimeData.length > 0 ? (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>{t('uptime.updating')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{t('uptime.autoRefresh')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Validators Table */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f0f0f] border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('uptime.validator')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('uptime.signingStatus')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('uptime.uptimeLabel')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('uptime.missed')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('uptime.jailed')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading && uptimeData.length === 0 ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gray-800" />
                            <div className="w-10 h-10 rounded-full bg-gray-800" />
                            <div className="h-4 w-32 bg-gray-800 rounded" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-full bg-gray-800 rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-16 bg-gray-800 rounded mx-auto" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-12 bg-gray-800 rounded mx-auto" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-20 bg-gray-800 rounded mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : sortedValidators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        {t('uptime.noValidators')}
                      </td>
                    </tr>
                  ) : (
                    sortedValidators.map((validator, index) => (
                      <tr 
                        key={validator.operator_address}
                        className="hover:bg-[#0f0f0f] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {validator.rank && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-400 text-sm font-bold">
                                {validator.rank}
                              </div>
                            )}
                            <ValidatorAvatar 
                              moniker={validator.moniker}
                              identity={validator.identity}
                              size="md"
                            />
                            <div>
                              <Link 
                                href={`/${chainPath}/validators/${validator.operator_address}`}
                                className="text-white font-medium hover:text-blue-400 transition-colors"
                              >
                                {validator.moniker}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {/* Block Signing Visualization */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-8 bg-[#0a0a0a] rounded-sm overflow-hidden border border-gray-800" style={{ minWidth: '600px', maxWidth: '800px' }}>
                              <div className="blocks-container absolute inset-0">
                                <div className={`blocks-wrapper ${validator.blockSignatures?.length === 100 ? 'animated' : ''}`}>
                                  {validator.blockSignatures && validator.blockSignatures.length > 0 ? (
                                    <>
                                      {validator.blockSignatures.map((isSigned, blockIndex) => (
                                        <div
                                          key={`${validator.operator_address}-${blockIndex}`}
                                          className={`flex-shrink-0 ${
                                            isSigned 
                                              ? 'bg-green-500' 
                                              : 'bg-red-500'
                                          }`}
                                          style={{
                                            width: '6px',
                                            height: '100%'
                                          }}
                                          title={`Block ${blockIndex + 1}: ${isSigned ? t('uptime.signed') : t('uptime.missedBlock')}`}
                                        />
                                      ))}
                                      {validator.blockSignatures.length < 100 && (
                                        Array.from({ length: 100 - validator.blockSignatures.length }).map((_, idx) => (
                                          <div
                                            key={`empty-${idx}`}
                                            className="flex-shrink-0 bg-gray-800/20"
                                            style={{ 
                                              width: '6px',
                                              height: '100%'
                                            }}
                                            title={t('uptime.notChecked')}
                                          />
                                        ))
                                      )}
                                    </>
                                  ) : (
                                    Array.from({ length: 100 }).map((_, blockIndex) => (
                                      <div
                                        key={blockIndex}
                                        className="flex-shrink-0 bg-gray-800/30"
                                        style={{ 
                                          width: '6px',
                                          height: '100%'
                                        }}
                                        title={t('uptime.loading')}
                                      />
                                    ))
                                  )}
                                </div>
                                {validator.blockSignatures?.length === 100 && (
                                  <div className={`blocks-wrapper animated`}>
                                    {validator.blockSignatures.map((isSigned, blockIndex) => (
                                      <div
                                        key={`dup-${validator.operator_address}-${blockIndex}`}
                                        className={`flex-shrink-0 ${
                                          isSigned 
                                            ? 'bg-green-500' 
                                            : 'bg-red-500'
                                        }`}
                                        style={{
                                          width: '6px',
                                          height: '100%'
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 font-mono whitespace-nowrap transition-all duration-500">
                              <span className={`transition-all duration-300 ${validator.blockSignatures?.length === 100 ? 'text-green-400 font-bold scale-110 inline-block' : ''}`}>
                                {validator.blockSignatures?.length || 0}
                              </span>
                              <span className="text-gray-600">/100</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-lg font-bold ${getUptimeColor(validator.uptime)}`} title={`${validator.signedBlocks || 0} signed out of ${blocksToCheck} blocks`}>
                            {validator.uptime.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white font-medium bg-[#0f0f0f] px-3 py-1 rounded-lg border border-gray-800">
                            {validator.missedBlocks}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {validator.jailed ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-medium">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                {t('uptime.jailedStatus')}
                              </span>
                              {validator.jailedUntil && validator.jailedUntil !== '1970-01-01T00:00:00Z' && (
                                <span className="text-xs text-red-400" title="Jailed until">
                                  {t('uptime.until')} {new Date(validator.jailedUntil).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                              {validator.tombstoned && (
                                <span className="text-xs text-red-500">{t('uptime.tombstoned')}</span>
                              )}
                            </div>
                          ) : validator.willBeJailed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-xs font-medium">
                              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                              {t('uptime.atRisk')}
                            </span>
                          ) : validator.jailedUntil && validator.jailedUntil !== '1970-01-01T00:00:00Z' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-green-400 text-xs font-medium">{t('uptime.active')}</span>
                              <span className="text-xs text-gray-500" title="Last unjailed">
                                {t('uptime.unjailed')} {new Date(validator.jailedUntil).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium mb-1">{t('uptime.aboutTitle')}</p>
                <p className="text-gray-400 text-sm">
                  <strong>{t('uptime.uptimeLabel')}</strong> {t('uptime.aboutDesc')} {blocksToCheck.toLocaleString()} {t('uptime.aboutBlocks')}
                  <strong> {t('uptime.aboutMissed')}</strong> {t('uptime.aboutMissedDesc')} <span className="text-orange-400">{t('uptime.aboutAtRisk')}</span> {t('uptime.aboutAtRiskDesc')}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

