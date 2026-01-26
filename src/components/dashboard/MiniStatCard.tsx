import { cn } from '@/lib/utils';

interface MiniStatCardProps {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percent';
  highlight?: boolean;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

const MiniStatCard = ({ label, value, format = 'number', highlight, trend, className }: MiniStatCardProps) => {
  const formatValue = () => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return `Rs. ${value.toLocaleString()}`;
      case 'percent':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className={cn(
      "glass-card p-3 rounded-lg",
      highlight && "border-brand/50 bg-brand/5",
      className
    )}>
      <p className="text-[10px] text-muted-foreground truncate mb-1">{label}</p>
      <p className={cn(
        "text-sm font-bold",
        highlight ? "text-brand" : "text-foreground"
      )}>
        {formatValue()}
      </p>
      {trend && (
        <p className={cn(
          "text-[10px] mt-0.5",
          trend.isPositive ? "text-green-500" : "text-red-500"
        )}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}%
        </p>
      )}
    </div>
  );
};

export default MiniStatCard;
