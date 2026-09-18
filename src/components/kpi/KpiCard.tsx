'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/format';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'default' | 'muted';
  icon?: React.ReactNode;
}

const colorMap = {
  green:   'text-emerald-400',
  red:     'text-red-400',
  yellow:  'text-amber-400',
  blue:    'text-blue-400',
  purple:  'text-violet-400',
  default: 'text-white',
  muted:   'text-slate-500',
};

export function KpiCard({ title, value, subtitle, trend, color = 'default', icon }: KpiCardProps) {
  const textColor = colorMap[color];

  return (
    <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-3 sm:p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className={cn('text-base sm:text-xl lg:text-2xl font-bold tabular-nums', textColor)}>{value}</div>
      <div className="flex items-center gap-2 min-h-[18px]">
        {trend !== undefined && (
          <>
            {trend > 0 ? (
              <TrendingUp size={13} className="text-emerald-400" />
            ) : trend < 0 ? (
              <TrendingDown size={13} className="text-red-400" />
            ) : (
              <Minus size={13} className="text-slate-500" />
            )}
            <span className={cn('text-xs', trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-500')}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </>
        )}
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
    </div>
  );
}
