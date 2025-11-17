'use client';
import { TrendingUp, TrendingDown } from 'lucide-react';
interface StatsCardProps {
  title: string;
  value: string;
  change?: number;
}
export default function StatsCard({ title, value, change }: StatsCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
      <div className="text-gray-400 text-sm mb-2">{title}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-white">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="ml-1">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
