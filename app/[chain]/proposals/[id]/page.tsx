'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Link from 'next/link';
import { ChainData } from '@/types/chain';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { getApiUrl } from '@/lib/config';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/i18n';

interface ProposalDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  submitTime: string;
  depositEndTime: string;
  votingStartTime: string;
  votingEndTime: string;
  totalDeposit: Array<{ denom: string; amount: string }>;
  tally: {
    yes: string;
    no: string;
    abstain: string;
    veto: string;
  };
  votes: Array<{
    voter: string;
    option: string;
    weight: string;
  }>;
  messages: any[];
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
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
        })
        .catch(err => console.error('Error loading chains:', err));
    }
  }, [params]);

  useEffect(() => {
    if (selectedChain && params?.id) {
      setLoading(true);
      const endpoint = getApiUrl(`api/proposal?chain=${selectedChain.chain_id || selectedChain.chain_name}&id=${params.id}`);
      
      fetch(endpoint)
        .then(res => {
          if (!res.ok) throw new Error('Proposal not found');
          return res.json();
        })
        .then(data => {
          setProposal(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading proposal:', err);
          setLoading(false);
        });
    }
  }, [selectedChain, params]);

  const chainPath = selectedChain?.chain_name.toLowerCase().replace(/\s+/g, '-') || '';

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; icon: any } } = {
      'PROPOSAL_STATUS_VOTING_PERIOD': { color: 'bg-blue-500', icon: Clock },
      'PROPOSAL_STATUS_PASSED': { color: 'bg-green-500', icon: CheckCircle },
      'PROPOSAL_STATUS_REJECTED': { color: 'bg-red-500', icon: XCircle },
      'PROPOSAL_STATUS_FAILED': { color: 'bg-red-500', icon: XCircle },
      'PROPOSAL_STATUS_DEPOSIT_PERIOD': { color: 'bg-yellow-500', icon: Clock },
    };

    const config = statusConfig[status] || { color: 'bg-gray-500', icon: FileText };
    const Icon = config.icon;
    const displayStatus = status.replace('PROPOSAL_STATUS_', '').replace(/_/g, ' ');

    return (
      <span className={`${config.color} text-white px-3 py-1 rounded-full text-sm flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        {displayStatus}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateVotePercentage = (votes: string, total: string) => {
    const v = parseInt(votes);
    const t = parseInt(total);
    if (t === 0) return 0;
    return ((v / t) * 100).toFixed(2);
  };

  const getVoteOption = (option: string | number) => {
    if (typeof option === 'number') {
      const optionMap: { [key: number]: string } = {
        1: 'Yes',
        2: 'Abstain',
        3: 'No',
        4: 'No with Veto',
      };
      return optionMap[option] || 'Unknown';
    }
    return option.replace('VOTE_OPTION_', '').replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex">
        <Sidebar selectedChain={selectedChain} />
        <div className="flex-1 flex flex-col">
          <Header chains={chains} selectedChain={selectedChain} onSelectChain={setSelectedChain} />
          <main className="flex-1 mt-16 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white">{t('proposalDetail.loading')}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex">
        <Sidebar selectedChain={selectedChain} />
        <div className="flex-1 flex flex-col">
          <Header chains={chains} selectedChain={selectedChain} onSelectChain={setSelectedChain} />
          <main className="flex-1 mt-16 p-6 flex items-center justify-center">
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('proposalDetail.notFound')}</h2>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('proposalDetail.goBack')}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalVotes = (proposal && proposal.tally) ? (
    parseInt(proposal.tally.yes || '0') + 
    parseInt(proposal.tally.no || '0') + 
    parseInt(proposal.tally.abstain || '0') + 
    parseInt(proposal.tally.veto || '0')
  ) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar selectedChain={selectedChain} />
      
      <div className="flex-1 flex flex-col">
        <Header chains={chains} selectedChain={selectedChain} onSelectChain={setSelectedChain} />

        <main className="flex-1 mt-16 p-6 overflow-auto">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-400 mb-6">
            <Link href={`/${chainPath}`} className="hover:text-blue-500">{t('proposalDetail.overview')}</Link>
            <span className="mx-2">/</span>
            <Link href={`/${chainPath}/proposals`} className="hover:text-blue-500">{t('proposalDetail.proposals')}</Link>
            <span className="mx-2">/</span>
            <span className="text-white">#{proposal.id}</span>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-blue-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('proposalDetail.backToProposals')}
          </button>

          {/* Proposal Header */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-400 text-lg">#{proposal.id}</span>
                  {getStatusBadge(proposal.status)}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{proposal.title}</h1>
                <p className="text-sm text-gray-400">{t('proposalDetail.type')}: {proposal.type}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-gray-400 text-sm mb-1">{t('proposalDetail.submitTime')}</p>
                <p className="text-white text-sm">{formatDate(proposal.submitTime)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">{t('proposalDetail.depositEnd')}</p>
                <p className="text-white text-sm">{formatDate(proposal.depositEndTime)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">{t('proposalDetail.votingStart')}</p>
                <p className="text-white text-sm">{formatDate(proposal.votingStartTime)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">{t('proposalDetail.votingEnd')}</p>
                <p className="text-white text-sm">{formatDate(proposal.votingEndTime)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">{t('proposalDetail.description')}</h2>
                <div className="text-gray-300 whitespace-pre-wrap">{proposal.description}</div>
              </div>

              {/* Messages */}
              {proposal.messages && proposal.messages.length > 0 && (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">{t('proposalDetail.messages')} ({proposal.messages.length})</h2>
                  <div className="space-y-4">
                    {proposal.messages.map((msg, idx) => (
                      <div key={idx} className="bg-[#0f0f0f] rounded-lg p-4">
                        <p className="text-blue-400 text-sm mb-2">{msg['@type']?.split('.').pop() || 'Unknown'}</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(msg, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Voting Results */}
              {proposal.tally && (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">{t('proposalDetail.votingResults')}</h2>
                  
                  {/* Yes */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{t('proposalDetail.yes')}</span>
                      <span className="text-sm text-gray-400">
                        {calculateVotePercentage(proposal.tally.yes || '0', totalVotes.toString())}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${calculateVotePercentage(proposal.tally.yes || '0', totalVotes.toString())}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{parseInt(proposal.tally.yes || '0').toLocaleString()} {t('proposalDetail.votes')}</p>
                  </div>

                  {/* No */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{t('proposalDetail.no')}</span>
                      <span className="text-sm text-gray-400">
                        {calculateVotePercentage(proposal.tally.no || '0', totalVotes.toString())}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${calculateVotePercentage(proposal.tally.no || '0', totalVotes.toString())}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{parseInt(proposal.tally.no || '0').toLocaleString()} {t('proposalDetail.votes')}</p>
                  </div>

                  {/* No with Veto */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{t('proposalDetail.noWithVeto')}</span>
                      <span className="text-sm text-gray-400">
                        {calculateVotePercentage(proposal.tally.veto || '0', totalVotes.toString())}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${calculateVotePercentage(proposal.tally.veto || '0', totalVotes.toString())}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{parseInt(proposal.tally.veto || '0').toLocaleString()} {t('proposalDetail.votes')}</p>
                  </div>

                  {/* Abstain */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{t('proposalDetail.abstain')}</span>
                      <span className="text-sm text-gray-400">
                        {calculateVotePercentage(proposal.tally.abstain || '0', totalVotes.toString())}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full transition-all"
                        style={{ width: `${calculateVotePercentage(proposal.tally.abstain || '0', totalVotes.toString())}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{parseInt(proposal.tally.abstain || '0').toLocaleString()} {t('proposalDetail.votes')}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400">{t('proposalDetail.totalVotes')}</p>
                    <p className="text-lg font-bold text-white">{totalVotes.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Recent Votes */}
              {proposal.votes && proposal.votes.length > 0 && (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {t('proposalDetail.recentVotes')} ({proposal.votes.length})
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {proposal.votes.map((vote, idx) => (
                      <div key={idx} className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 font-mono truncate">{vote.voter}</p>
                        </div>
                        <span className={`ml-2 text-xs px-2 py-1 rounded ${
                          getVoteOption(vote.option).toLowerCase().includes('yes') ? 'bg-green-500/20 text-green-500' :
                          getVoteOption(vote.option).toLowerCase().includes('no') ? 'bg-red-500/20 text-red-500' :
                          getVoteOption(vote.option).toLowerCase().includes('abstain') ? 'bg-gray-500/20 text-gray-500' :
                          'bg-orange-500/20 text-orange-500'
                        }`}>
                          {getVoteOption(vote.option)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

