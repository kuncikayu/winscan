'use client';
import { ValidatorData, ChainAsset } from '@/types/chain';
import Link from 'next/link';
import { Users, TrendingUp } from 'lucide-react';
import ValidatorAvatar from '@/components/ValidatorAvatar';
import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';
interface ValidatorsTableProps {
  validators: ValidatorData[];
  chainName: string;
  asset?: ChainAsset;
}
const ValidatorRow = memo(({ validator, chainPath, asset, t }: { 
  validator: ValidatorData; 
  chainPath: string; 
  asset?: ChainAsset;
  t: (key: string) => string;
}) => {
  const formatVotingPower = (power: string) => {
    if (!asset) return power;
    const powerNum = parseFloat(power) / Math.pow(10, Number(asset.exponent));
    if (powerNum >= 1e6) return `${(powerNum / 1e6).toFixed(2)}M`;
    if (powerNum >= 1e3) return `${(powerNum / 1e3).toFixed(2)}K`;
    return powerNum.toFixed(2);
  };
  const formatCommission = (commission: string) => {
    return `${(parseFloat(commission) * 100).toFixed(2)}%`;
  };
  return (
    <tr className="border-b border-gray-800 hover:bg-[#1a1a1a] transition-colors duration-150">
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <ValidatorAvatar
            identity={validator.identity}
            moniker={validator.moniker}
            size="md"
          />
          <div>
            <Link
              href={`/${chainPath}/validators/${validator.address}`}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {validator.moniker || t('common.unknown')}
            </Link>
            {validator.jailed && (
              <span className="ml-2 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                {t('validators.jailed')}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          validator.status === 'BOND_STATUS_BONDED'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {validator.status === 'BOND_STATUS_BONDED' ? t('validators.active') : t('validators.inactive')}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-300">
        {formatVotingPower(validator.votingPower || '0')}
        {asset && <span className="text-gray-500 ml-1">{asset.symbol}</span>}
      </td>
      <td className="px-6 py-4 text-gray-300">
        {formatCommission(validator.commission || '0')}
      </td>
    </tr>
  );
});
ValidatorRow.displayName = 'ValidatorRow';
export default function ValidatorsTable({ validators, chainName, asset }: ValidatorsTableProps) {
  const chainPath = chainName.toLowerCase().replace(/\s+/g, '-');
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const totalVotingPower = validators.reduce((sum, v) => sum + parseFloat(v.votingPower || '0'), 0);
  const activeCount = validators.filter(v => v.status === 'BOND_STATUS_BONDED' && !v.jailed).length;
  const formatVotingPower = (power: string) => {
    if (!asset) return power;
    const powerNum = parseFloat(power) / Math.pow(10, Number(asset.exponent));
    if (powerNum >= 1e6) return `${(powerNum / 1e6).toFixed(2)}M`;
    if (powerNum >= 1e3) return `${(powerNum / 1e3).toFixed(2)}K`;
    return powerNum.toFixed(2);
  };
  return (
    <div className="space-y-6 smooth-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">{t('validators.title')}</p>
              <p className="text-3xl font-bold text-white">{validators.length}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">{t('validators.active')} {t('validators.title')}</p>
              <p className="text-3xl font-bold text-white">{activeCount}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 hover-lift">
          <div>
            <p className="text-gray-400 text-sm mb-1">{t('validators.votingPower')}</p>
            <p className="text-3xl font-bold text-white">
              {formatVotingPower(totalVotingPower.toString())} {asset?.symbol}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f0f0f] border-b border-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{t('validators.moniker')}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{t('validators.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{t('validators.votingPower')}</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{t('validators.commission')}</th>
            </tr>
          </thead>
          <tbody>
            {validators.map((validator) => (
              <ValidatorRow
                key={validator.address}
                validator={validator}
                chainPath={chainPath}
                asset={asset}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
