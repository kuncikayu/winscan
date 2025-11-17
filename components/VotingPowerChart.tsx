'use client';
import { useEffect, useRef, useState } from 'react';
import { PieChart } from 'lucide-react';
interface VotingPowerChartProps {
  validators?: Array<{
    name: string;
    votingPower: number;
    percentage: number;
  }>;
}
export default function VotingPowerChart({ validators }: VotingPowerChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const timer = setTimeout(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const chartValidators = validators && validators.length > 0 ? validators : [
        { name: 'Validator 1', votingPower: 1000000, percentage: 25 },
        { name: 'Validator 2', votingPower: 800000, percentage: 20 },
        { name: 'Validator 3', votingPower: 700000, percentage: 17.5 },
        { name: 'Validator 4', votingPower: 600000, percentage: 15 },
        { name: 'Validator 5', votingPower: 400000, percentage: 10 },
        { name: 'Validator 6', votingPower: 300000, percentage: 7.5 },
        { name: 'Others', votingPower: 200000, percentage: 5 },
      ];
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      console.log('Canvas rect:', rect.width, rect.height);
      if (rect.width === 0 || rect.height === 0) {
        console.log('Canvas has zero dimensions, skipping render');
        return;
      }
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    const centerX = width * 0.30;
    const centerY = height / 2;
    const radius = Math.min(width * 0.25, height * 0.40);
    ctx.clearRect(0, 0, width, height);
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
      '#14B8A6', // teal
      '#A855F7', // violet
      '#84CC16', // lime
      ];
    const pieData = chartValidators;
    let currentAngle = -Math.PI / 2; // Start from top
    pieData.forEach((validator, i) => {
      const sliceAngle = (validator.percentage / 100) * Math.PI * 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.stroke();
      currentAngle += sliceAngle;
    });
    const legendX = width * 0.55;
    const legendStartY = 15;
    const legendItemHeight = 26;
    const maxVisibleItems = Math.floor((height - 30) / legendItemHeight);
    pieData.slice(0, maxVisibleItems).forEach((validator, i) => {
      const y = legendStartY + i * legendItemHeight;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 3;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(legendX, y, 16, 16);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, y, 16, 16);
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      const maxLength = 22;
      const name = validator.name.length > maxLength ? validator.name.substring(0, maxLength) + '...' : validator.name;
      ctx.fillText(name, legendX + 24, y + 12);
      ctx.font = '11px Inter, system-ui, sans-serif';
      const percentText = `${validator.percentage.toFixed(2)}%`;
      const percentWidth = ctx.measureText(percentText).width;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(width - percentWidth - 25, y + 2, percentWidth + 10, 14);
      ctx.fillStyle = '#60a5fa';
      ctx.textAlign = 'right';
      ctx.fillText(percentText, width - 20, y + 12);
    });
    }, 200); // Increased delay
    return () => clearTimeout(timer);
  }, [validators, mounted]);
  return (
    <div className="bg-card border border-theme rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-theme flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-primary" />
          Voting Power Distribution
        </h3>
        <div className="text-sm text-dim">
          Top 10 from {validators?.length || 0} Active Validators
        </div>
      </div>
      <div className="w-full" style={{ minHeight: '320px', height: '320px' }}>
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
