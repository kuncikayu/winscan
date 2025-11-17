'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ValidatorsTable from '@/components/ValidatorsTable';
import { ChainData, ValidatorData } from '@/types/chain';
import { getCacheKey, setCache, getStaleCache } from '@/lib/cacheUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';

export default function ValidatorsPage() {
  const params = useParams();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

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
      return;
    }

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
  }, [params]);

  const fetchValidators = useCallback(async (showLoading = true) => {
    if (!selectedChain) return;
    
    const cacheKey = getCacheKey('validators', selectedChain.chain_name);
    const cachedData = getStaleCache<ValidatorData[]>(cacheKey);
    
    if (cachedData && cachedData.length > 0) {
      setValidators(cachedData);
      setLoading(false);
    }
    
    if (showLoading && !cachedData) setLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`/api/validators?chain=${selectedChain.chain_id || selectedChain.chain_name}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      startTransition(() => {
        setValidators(data);
        setCache(cacheKey, data);
      });
    } catch (err) {
      if (cachedData) setValidators(cachedData);
    } finally {
      setLoading(false);
    }
  }, [selectedChain]);

  useEffect(() => {
    fetchValidators(true);
  }, [fetchValidators]);

  useEffect(() => {
    if (!selectedChain) return;
    
    const interval = setInterval(() => {
      fetchValidators(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedChain, fetchValidators]);

  const validValidators = useMemo(() => 
    Array.isArray(validators) ? validators : [], 
    [validators]
  );

  const { active, inactive, all } = useMemo(() => {
    const active = validValidators.filter(v => v.status === 'BOND_STATUS_BONDED' && !v.jailed);
    const inactive = validValidators.filter(v => v.status !== 'BOND_STATUS_BONDED' || v.jailed);
    return { active, inactive, all: validValidators };
  }, [validValidators]);

  const filteredValidators = useMemo(() => {
    let result = all;
    
    if (filter === 'active') result = active;
    else if (filter === 'inactive') result = inactive;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.moniker?.toLowerCase().includes(query) ||
        v.address?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [filter, active, inactive, all, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          chains={chains}
          selectedChain={selectedChain}
          onSelectChain={setSelectedChain}
        />

        <main className="flex-1 mt-16 p-6 overflow-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('validators.title')}</h1>
              <p className="text-gray-400">
                {t('validators.subtitle')} {selectedChain?.chain_name}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-xs text-gray-400">{t('overview.live')}</span>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder={t('validators.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-400">
                {t('validators.found')} <span className="text-blue-400 font-bold">{filteredValidators.length}</span> {t('validators.validator')}{filteredValidators.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === 'active'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              {t('validators.active')} ({active.length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === 'inactive'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              {t('validators.inactive')} ({inactive.length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              {t('validators.all')} ({all.length})
            </button>
          </div>

          {loading && validators.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-400">{t('validators.loading')}</p>
            </div>
          ) : (
            <ValidatorsTable 
              validators={filteredValidators} 
              chainName={selectedChain?.chain_name || ''}
              asset={selectedChain?.assets[0]}
            />
          )}
        </main>

        <footer className="border-t border-gray-800 py-6 px-6 mt-auto">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2025 WinScan. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

