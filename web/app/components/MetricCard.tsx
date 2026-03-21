'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  subValue?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MetricCard({ 
  label, 
  value, 
  subValue, 
  icon, 
  trend,
  size = 'md',
  className = ''
}: MetricCardProps) {
  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === 'N/A') return '—';
    if (typeof val === 'number') {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
      if (val >= 1000) return val.toLocaleString('en-IN');
      return val.toFixed(2);
    }
    return val;
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-slate-100 ${sizeClasses[size]} hover:border-slate-200 hover:shadow-sm transition-all ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className={`${valueSizeClasses[size]} font-bold text-slate-900 mt-1 truncate`}>
            {formatValue(value)}
          </p>
          {subValue && (
            <p className={`text-xs mt-0.5 ${
              trend === 'up' ? 'text-emerald-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-slate-500'
            }`}>
              {trend === 'up' && '↑ '}
              {trend === 'down' && '↓ '}
              {subValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-2 p-2 bg-slate-50 rounded-lg text-slate-400">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function MetricGrid({ children, columns = 4 }: MetricGridProps) {
  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={`grid ${colClasses[columns]} gap-3`}>
      {children}
    </div>
  );
}
