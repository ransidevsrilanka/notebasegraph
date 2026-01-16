import { cn } from "@/lib/utils";
import { AlertTriangle, Ban, Zap } from "lucide-react";

interface CreditBarProps {
  used: number;
  limit: number;
  strikes: number;
  isSuspended: boolean;
  className?: string;
}

export function CreditBar({ used, limit, strikes, isSuspended, className }: CreditBarProps) {
  const remaining = limit - used;
  const percentageUsed = limit > 0 ? (used / limit) * 100 : 0;
  const percentageRemaining = 100 - percentageUsed;

  // Color based on remaining percentage
  const getBarColor = () => {
    if (isSuspended) return "bg-destructive";
    if (percentageRemaining <= 10) return "bg-destructive";
    if (percentageRemaining <= 20) return "bg-orange-500";
    if (percentageRemaining <= 50) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getTextColor = () => {
    if (isSuspended) return "text-destructive";
    if (percentageRemaining <= 10) return "text-destructive";
    if (percentageRemaining <= 20) return "text-orange-500";
    if (percentageRemaining <= 50) return "text-yellow-500";
    return "text-emerald-500";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Suspension Warning */}
      {isSuspended && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <Ban className="h-4 w-4" />
          <span>AI access suspended due to policy violations</span>
        </div>
      )}

      {/* Low Credits Warning */}
      {!isSuspended && percentageRemaining <= 20 && percentageRemaining > 0 && (
        <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-500/10 px-3 py-2 rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          <span>Low credits remaining this month</span>
        </div>
      )}

      {/* No Credits Warning */}
      {!isSuspended && remaining <= 0 && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          <span>No credits remaining - chat disabled until next month</span>
        </div>
      )}

      {/* Credit Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            <span>Credits this month</span>
          </div>
          <span className={cn("font-medium", getTextColor())}>
            {remaining.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", getBarColor())}
            style={{ width: `${percentageRemaining}%` }}
          />
        </div>

        {/* Strikes indicator */}
        {strikes > 0 && !isSuspended && (
          <div className="flex items-center justify-end gap-1 text-xs text-orange-500">
            <AlertTriangle className="h-3 w-3" />
            <span>{3 - strikes} warning{3 - strikes !== 1 ? "s" : ""} remaining</span>
          </div>
        )}
      </div>
    </div>
  );
}
