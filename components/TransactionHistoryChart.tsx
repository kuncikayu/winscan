'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
interface TransactionHistoryChartProps {
  data?: { date: string; count: number }[];
}
type TimeRange = '7d' | '30d' | '365d';
export default function TransactionHistoryChart({ data }: TransactionHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const getDaysCount = () => {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '365d': return 365;
      default: return 30;
    }
  };
  const getLabel = () => {
    switch (timeRange) {
      case '7d': return '7 Days';
      case '30d': return '30 Days';
      case '365d': return '1 Year';
      default: return '30 Days';
    }
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const daysCount = getDaysCount();
    let chartData = data && data.length > 0 
      ? data.slice(0, daysCount).reverse() 
      : Array.from({ length: daysCount }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (daysCount - 1 - i));
          return {
            date: date.toISOString(),
            count: 0
          };
        });
    if (chartData.length < daysCount) {
      const missing = daysCount - chartData.length;
      const oldestDate = new Date(chartData[0].date);
      const fillerData = Array.from({ length: missing }, (_, i) => {
        const date = new Date(oldestDate);
        date.setDate(date.getDate() - (missing - i));
        return {
          date: date.toISOString(),
          count: 0
        };
      });
      chartData = [...fillerData, ...chartData];
    }
    console.log('[TransactionChart] Rendering with data:', chartData.slice(0, 3));
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    ctx.clearRect(0, 0, width, height);
    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const minCount = 0;
    const range = maxCount - minCount;
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      const value = Math.round(maxCount - (range / gridLines) * i);
      ctx.fillStyle = '#888';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    ctx.beginPath();
    chartData.forEach((point, i) => {
      const x = padding.left + (chartWidth / (chartData.length - 1)) * i;
      const y = padding.top + chartHeight - ((point.count - minCount) / range) * chartHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    const lastX = padding.left + chartWidth;
    const baseY = padding.top + chartHeight;
    ctx.lineTo(lastX, baseY);
    ctx.lineTo(padding.left, baseY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    chartData.forEach((point, i) => {
      const x = padding.left + (chartWidth / (chartData.length - 1)) * i;
      const y = padding.top + chartHeight - ((point.count - minCount) / range) * chartHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    chartData.forEach((point, i) => {
      const x = padding.left + (chartWidth / (chartData.length - 1)) * i;
      const y = padding.top + chartHeight - ((point.count - minCount) / range) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#0f0f0f';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.fillStyle = '#888';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelInterval = timeRange === '365d' ? 30 : (timeRange === '30d' ? 5 : 1);
    chartData.forEach((point, i) => {
      if (i % labelInterval === 0 || i === chartData.length - 1) {
        const x = padding.left + (chartWidth / (chartData.length - 1)) * i;
        const date = new Date(point.date);
        const label = timeRange === '365d' 
          ? `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`
          : `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, height - 20);
      }
    });
  }, [data, timeRange]);
  return (
    <div className="bg-card border border-theme rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-theme flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary" />
          Transaction History ({getLabel()})
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-sm text-dim">
            Total: {(data || []).reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeRange === '7d'
                  ? 'bg-primary text-primary-text font-semibold'
                  : 'bg-surface border border-theme text-dim hover:border-primary'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeRange === '30d'
                  ? 'bg-primary text-primary-text font-semibold'
                  : 'bg-surface border border-theme text-dim hover:border-primary'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setTimeRange('365d')}
              className={`px-3 py-1 text-xs rounded transition-all ${
                timeRange === '365d'
                  ? 'bg-primary text-primary-text font-semibold'
                  : 'bg-surface border border-theme text-dim hover:border-primary'
              }`}
            >
              1Y
            </button>
          </div>
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        className="w-full"
        style={{ height: '200px' }}
      />
    </div>
  );
}
