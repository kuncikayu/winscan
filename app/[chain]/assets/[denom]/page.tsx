'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { ChainData } from '@/types/chain';
import { ArrowLeft, Coins, ExternalLink, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';

interface DenomUnit {
  denom: string;
  exponent: number;
  aliases: string[];
}

interface AssetDetail {
  denom: string;
  metadata: {
    description: string;
    denom_units: DenomUnit[];
    base: string;
    display: string;
    name: string;
    symbol: string;
    uri: string;
    uri_hash: string;
  } | null;
  supply: string | null;
  supply_formatted: string;
  holders: number | null;
  holders_type: string;
  price: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
  } | null;
}

export default function AssetDetailPage() {
  const params = useParams();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const chainName = params.chain as string;
  const denom = decodeURIComponent(params.denom as string);
  
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadChainData() {
      const response = await fetch('/chains.json');
      const data = await response.json();
      setChains(data);

      const chain = data.find((c: ChainData) => 
        c.chain_name.toLowerCase().replace(/\s+/g, '-') === chainName.toLowerCase()
      ) || data[0];
      setSelectedChain(chain);
    }
    loadChainData();
  }, [chainName]);

  useEffect(() => {
    async function fetchAssetDetail() {
      if (!chainName || !denom) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/asset-detail?chain=${chainName}&denom=${encodeURIComponent(denom)}`);
        const data: AssetDetail = await response.json();
        
        if (data) {
          setAsset(data);
        }
      } catch (error) {
        console.error('Error fetching asset detail:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssetDetail();
  }, [chainName, denom]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSupply = (supply: string, exponent: number) => {
    if (!supply || supply === '0') return '0';
    
    try {
      const amount = BigInt(supply);
      const divisor = BigInt(10 ** exponent);

      const wholePart = amount / divisor;
      const remainder = amount % divisor;

      let displayAmount: string;
      
      if (exponent > 0) {
        const fractionalPart = remainder.toString().padStart(exponent, '0');
        const decimalValue = parseFloat(`${wholePart}.${fractionalPart}`);
        displayAmount = decimalValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        });
      } else {
        displayAmount = wholePart.toLocaleString('en-US');
      }
      
      return displayAmount;
    } catch (error) {
      return '-';
    }
  };

  const isNativeAsset = (base: string) => {
    return !base.startsWith('ibc/') && !base.startsWith('factory/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar selectedChain={selectedChain} />
        <div className="flex-1">
          <Header 
            chains={chains}
            selectedChain={selectedChain} 
            onSelectChain={setSelectedChain}
          />
          <main className="p-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar selectedChain={selectedChain} />
        <div className="flex-1">
          <Header 
            chains={chains}
            selectedChain={selectedChain} 
            onSelectChain={setSelectedChain}
          />
          <main className="p-6">
            <div className="text-center py-12">
              <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{t('assetDetail.notFound')}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const displayUnit = asset.metadata?.denom_units.find((u: DenomUnit) => u.denom === asset.metadata?.display);
  const exponent = displayUnit ? displayUnit.exponent : 6;
  const isNative = isNativeAsset(asset.denom);

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1">
        <Header 
          chains={chains}
          selectedChain={selectedChain} 
          onSelectChain={setSelectedChain}
        />
        
        <main className="p-6 pt-24">
          {/* Back Button */}
          <Link 
            href={`/${chainName}/assets`}
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('assetDetail.backToAssets')}</span>
          </Link>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Coins className="w-8 h-8 text-blue-500" />
                  <h1 className="text-3xl font-bold text-white">
                    {asset.metadata?.name || asset.metadata?.symbol || t('assetDetail.title')}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isNative
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}
                  >
                    {isNative ? t('assetDetail.native') : t('assetDetail.token')}
                  </span>
                </div>
                {asset.metadata?.description && (
                  <p className="text-gray-400 max-w-3xl">
                    {asset.metadata.description}
                  </p>
                )}
              </div>
              {asset.metadata?.uri && (
                <a
                  href={asset.metadata.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t('assetDetail.viewExternal')}</span>
                </a>
              )}
            </div>
          </div>

          {/* Price Card (if available) */}
          {asset.price && asset.price.usd > 0 && (
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-2">{t('assetDetail.currentPrice')}</div>
                  <div className="text-4xl font-bold text-white mb-2">
                    ${asset.price.usd < 0.01 
                      ? asset.price.usd.toFixed(8) 
                      : asset.price.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                    }
                  </div>
                  {asset.price.usd_24h_change !== 0 && (
                    <div className={`flex items-center gap-2 text-lg font-bold ${
                      asset.price.usd_24h_change > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {asset.price.usd_24h_change > 0 ? '↑' : '↓'}
                      {Math.abs(asset.price.usd_24h_change).toFixed(2)}% (24h)
                    </div>
                  )}
                </div>
                {asset.price.usd_market_cap > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-2">{t('assetDetail.marketCap')}</div>
                    <div className="text-2xl font-bold text-white">
                      ${asset.price.usd_market_cap.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Supply */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">{t('assetDetail.totalSupply')}</div>
              <div className="text-2xl font-bold text-white">
                {asset.supply_formatted || formatSupply(asset.supply || '0', exponent)}
              </div>
              {asset.metadata?.symbol && (
                <div className="text-sm text-gray-500 mt-1">{asset.metadata.symbol}</div>
              )}
            </div>

            {/* Holders */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">{t('assetDetail.holders')}</div>
              <div className="text-2xl font-bold text-blue-400">
                {asset.holders && asset.holders > 0 ? asset.holders.toLocaleString() : '-'}
              </div>
              {asset.holders_type && asset.holders_type !== 'unavailable' && (
                <div className="text-xs text-gray-500 mt-1">
                  {asset.holders_type === 'total_accounts' ? t('assetDetail.totalAccounts') : t('assetDetail.estimated')}
                </div>
              )}
            </div>

            {/* Symbol */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">{t('assetDetail.symbol')}</div>
              <div className="text-2xl font-bold text-white">
                {asset.metadata?.symbol || '-'}
              </div>
            </div>

            {/* Exponent */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">{t('assetDetail.decimals')}</div>
              <div className="text-2xl font-bold text-white">
                {exponent}
              </div>
            </div>
          </div>

          {/* Asset Information */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{t('assetDetail.assetInfo')}</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {/* Base Denom */}
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-400 mb-1">{t('assetDetail.baseDenom')}</div>
                    <div className="text-sm text-white font-mono break-all">
                      {asset.denom}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(asset.denom)}
                    className="ml-4 p-2 text-gray-400 hover:text-white transition-colors"
                    title={t('assetDetail.copyToClipboard')}
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Display Denom */}
              <div className="px-6 py-4">
                <div className="text-sm text-gray-400 mb-1">{t('assetDetail.displayDenom')}</div>
                <div className="text-sm text-white">
                  {asset.metadata?.display || '-'}
                </div>
              </div>

              {/* Name */}
              <div className="px-6 py-4">
                <div className="text-sm text-gray-400 mb-1">{t('assetDetail.name')}</div>
                <div className="text-sm text-white">
                  {asset.metadata?.name || '-'}
                </div>
              </div>

              {/* URI Hash */}
              {asset.metadata?.uri_hash && (
                <div className="px-6 py-4">
                  <div className="text-sm text-gray-400 mb-1">{t('assetDetail.uriHash')}</div>
                  <div className="text-sm text-white font-mono break-all">
                    {asset.metadata.uri_hash}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Denom Units */}
          {asset.metadata?.denom_units && asset.metadata.denom_units.length > 0 && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">{t('assetDetail.denomUnits')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0f0f0f] border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('assetDetail.denom')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('assetDetail.exponent')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('assetDetail.aliases')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {asset.metadata.denom_units.map((unit, index) => (
                      <tr key={index} className="hover:bg-[#0f0f0f] transition-colors">
                        <td className="px-6 py-4 text-sm text-white font-mono">
                          {unit.denom}
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {unit.exponent}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {unit.aliases && unit.aliases.length > 0 
                            ? unit.aliases.join(', ') 
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

