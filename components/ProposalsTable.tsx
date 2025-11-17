'use client';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { Vote, CheckCircle, XCircle, Clock, TrendingUp, Calendar, FileText, ChevronRight } from 'lucide-react';
interface Proposal {
  id: string;
  title: string;
  status: string;
  type: string;
  submitTime: string;
  votingStartTime: string;
  votingEndTime: string;
  yesVotes: string;
  noVotes: string;
  abstainVotes: string;
  vetoVotes: string;
}
interface ProposalsTableProps {
  proposals: Proposal[];
  chainName: string;
  t: (key: string) => string;
}
export default function ProposalsTable({ proposals, chainName, t }: ProposalsTableProps) {
  const chainPath = chainName.toLowerCase().replace(/\s+/g, '-');
  const getStatusColor = (status: string) => {
    if (status.includes('VOTING')) return 'bg-blue-500/10 text-blue-500';
    if (status.includes('PASSED')) return 'bg-green-500/10 text-green-500';
    if (status.includes('REJECTED')) return 'bg-red-500/10 text-red-500';
    if (status.includes('DEPOSIT')) return 'bg-yellow-500/10 text-yellow-500';
    return 'bg-gray-500/10 text-gray-500';
  };
  const getStatusLabel = (status: string) => {
    if (status.includes('VOTING')) return t('proposals.filterVoting');
    if (status.includes('PASSED')) return t('proposals.filterPassed');
    if (status.includes('REJECTED')) return t('proposals.filterRejected');
    if (status.includes('DEPOSIT')) return 'Deposit Period';
    return status;
  };
  const getStatusIcon = (status: string) => {
    if (status.includes('VOTING')) return <Clock className="w-4 h-4" />;
    if (status.includes('PASSED')) return <CheckCircle className="w-4 h-4" />;
    if (status.includes('REJECTED')) return <XCircle className="w-4 h-4" />;
    return <Vote className="w-4 h-4" />;
  };
  const calculateVotePercentage = (votes: string, total: number) => {
    if (total === 0) return 0;
    return (parseFloat(votes) / total * 100).toFixed(2);
  };
  const formatVoteAmount = (votes: string) => {
    const num = parseFloat(votes || '0');
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(0);
  };
  return (
    <div className="space-y-6">
      {proposals.length === 0 ? (
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-gray-800 rounded-2xl p-16 text-center">
          <div className="bg-gray-800/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Vote className="w-12 h-12 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">{t('proposals.noProposals')}</h3>
          <p className="text-gray-500">{t('proposals.noProposalsDesc')}</p>
        </div>
      ) : (
        proposals.map((proposal) => {
          const totalVotes = parseFloat(proposal.yesVotes || '0') + 
                            parseFloat(proposal.noVotes || '0') + 
                            parseFloat(proposal.abstainVotes || '0') + 
                            parseFloat(proposal.vetoVotes || '0');
          const yesPercentage = calculateVotePercentage(proposal.yesVotes, totalVotes);
          const isVoting = proposal.status.includes('VOTING');
          const isPassed = proposal.status.includes('PASSED');
          const isRejected = proposal.status.includes('REJECTED');
          return (
            <Link
              key={proposal.id}
              href={`/${chainPath}/proposals/${proposal.id}`}
              className="block group"
            >
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                {}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl px-4 py-2">
                      <span className="text-blue-400 font-bold text-lg">#{proposal.id}</span>
                    </div>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getStatusColor(proposal.status)} backdrop-blur-sm`}>
                      {getStatusIcon(proposal.status)}
                      {getStatusLabel(proposal.status)}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                {}
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                    {proposal.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">
                      {proposal.type?.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || t('proposals.unknownType')}
                    </span>
                  </div>
                </div>
                {}
                {totalVotes > 0 && (
                  <div className="mb-5">
                    {}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-400">{t('proposals.votingResults')}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-300">
                          {formatVoteAmount(totalVotes.toString())} {t('proposals.totalVotes')}
                        </span>
                      </div>
                      {}
                      <div className="bg-gray-800 rounded-full h-3 overflow-hidden flex">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                          style={{ width: `${yesPercentage}%` }}
                          title={`Yes: ${yesPercentage}%`}
                        />
                        <div 
                          className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                          style={{ width: `${calculateVotePercentage(proposal.noVotes, totalVotes)}%` }}
                          title={`No: ${calculateVotePercentage(proposal.noVotes, totalVotes)}%`}
                        />
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
                          style={{ width: `${calculateVotePercentage(proposal.abstainVotes, totalVotes)}%` }}
                          title={`Abstain: ${calculateVotePercentage(proposal.abstainVotes, totalVotes)}%`}
                        />
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                          style={{ width: `${calculateVotePercentage(proposal.vetoVotes, totalVotes)}%` }}
                          title={`Veto: ${calculateVotePercentage(proposal.vetoVotes, totalVotes)}%`}
                        />
                      </div>
                    </div>
                    {}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {}
                      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-400">{t('proposals.yes')}</span>
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <div className="text-lg font-bold text-green-400">{yesPercentage}%</div>
                        <div className="text-xs text-gray-500">{formatVoteAmount(proposal.yesVotes)}</div>
                      </div>
                      {}
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-red-400">{t('proposals.no')}</span>
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <div className="text-lg font-bold text-red-400">
                          {calculateVotePercentage(proposal.noVotes, totalVotes)}%
                        </div>
                        <div className="text-xs text-gray-500">{formatVoteAmount(proposal.noVotes)}</div>
                      </div>
                      {}
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-yellow-400">{t('proposals.abstain')}</span>
                          <Clock className="w-3.5 h-3.5 text-yellow-400" />
                        </div>
                        <div className="text-lg font-bold text-yellow-400">
                          {calculateVotePercentage(proposal.abstainVotes, totalVotes)}%
                        </div>
                        <div className="text-xs text-gray-500">{formatVoteAmount(proposal.abstainVotes)}</div>
                      </div>
                      {}
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-purple-400">{t('proposals.veto')}</span>
                          <XCircle className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {calculateVotePercentage(proposal.vetoVotes, totalVotes)}%
                        </div>
                        <div className="text-xs text-gray-500">{formatVoteAmount(proposal.vetoVotes)}</div>
                      </div>
                    </div>
                  </div>
                )}
                {}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">{t('proposals.submitted')}</span>
                    <span className="text-gray-300 font-medium">
                      {format(new Date(proposal.submitTime), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  {isVoting && proposal.votingEndTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-500">{t('proposals.ends')}</span>
                      <span className="text-blue-400 font-medium">
                        {formatDistanceToNow(new Date(proposal.votingEndTime), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  {(isPassed || isRejected) && proposal.votingEndTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-gray-500">{t('proposals.ended')}</span>
                      <span className="text-gray-300">
                        {formatDistanceToNow(new Date(proposal.votingEndTime), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
