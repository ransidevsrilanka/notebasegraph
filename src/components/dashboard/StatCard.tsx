import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

// Format large numbers with abbreviations
const formatValue = (value: string | number): string => {
  if (typeof value === 'string') return value;
  
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `${(value / 100000).toFixed(2)}L`;
  } else if (value >= 1000) {
    return value.toLocaleString();
  }
  return value.toString();
};

export const StatCard = ({ label, value, icon: Icon, trend, className }: StatCardProps) => {
  const displayValue = typeof value === 'number' && value > 999999 
    ? formatValue(value) 
    : typeof value === 'number' 
      ? value.toLocaleString() 
      : value;

  return (
    <div className={cn(
      "glass-card p-5 transition-all hover:border-border/60",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground/80" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            trend.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className={cn(
        "font-bold text-foreground tracking-tight",
        displayValue.length > 12 ? "text-xl" : "text-2xl"
      )}>
        {displayValue}
      </p>
      <p className="text-muted-foreground text-sm mt-1">{label}</p>
    </div>
  );
};

export default StatCard;
