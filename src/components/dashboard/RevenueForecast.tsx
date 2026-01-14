import { TrendingUp, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';

interface RevenueForecastProps {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  twoMonthsAgoRevenue: number;
  daysIntoMonth: number;
}

export const RevenueForecast = ({ 
  thisMonthRevenue, 
  lastMonthRevenue, 
  twoMonthsAgoRevenue,
  daysIntoMonth 
}: RevenueForecastProps) => {
  // Calculate monthly growth trend (average of last 2 months)
  const growth1 = lastMonthRevenue > 0 && twoMonthsAgoRevenue > 0 
    ? ((lastMonthRevenue - twoMonthsAgoRevenue) / twoMonthsAgoRevenue) 
    : 0;
  const growth2 = thisMonthRevenue > 0 && lastMonthRevenue > 0 
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) 
    : 0;
  
  const avgGrowthRate = (growth1 + growth2) / 2;
  
  // Project this month based on days passed
  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const projectedThisMonth = daysIntoMonth > 0 
    ? Math.round((thisMonthRevenue / daysIntoMonth) * totalDaysInMonth)
    : thisMonthRevenue;
  
  // Forecast next month
  const forecastNextMonth = Math.round(projectedThisMonth * (1 + avgGrowthRate));
  
  // Trend percentage
  const trendPercent = lastMonthRevenue > 0 
    ? Math.round(((projectedThisMonth - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;
  
  const isPositiveTrend = trendPercent >= 0;

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-purple-400" />
        Revenue Forecast
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* This Month Projected */}
        <div className="p-4 rounded-xl bg-brand/10 border border-brand/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">This Month (Projected)</span>
            <div className={`flex items-center gap-1 text-xs ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
              {isPositiveTrend ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trendPercent)}%
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">Rs. {projectedThisMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Current: Rs. {thisMonthRevenue.toLocaleString()} ({daysIntoMonth}/{totalDaysInMonth} days)
          </p>
        </div>

        {/* Next Month Forecast */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Next Month (Forecast)</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">Rs. {forecastNextMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {(avgGrowthRate * 100).toFixed(1)}% avg growth
          </p>
        </div>
      </div>

      {/* Growth Trend Visual */}
      <div className="mt-4 p-3 rounded-lg bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Growth Trend (3 months)</span>
          <span className={isPositiveTrend ? 'text-green-500' : 'text-red-500'}>
            {isPositiveTrend ? '↗' : '↘'} {avgGrowthRate > 0 ? '+' : ''}{(avgGrowthRate * 100).toFixed(1)}% avg
          </span>
        </div>
        <div className="flex items-end gap-2 h-12">
          <div 
            className="flex-1 bg-muted-foreground/30 rounded-t"
            style={{ height: `${Math.min((twoMonthsAgoRevenue / Math.max(projectedThisMonth, 1)) * 100, 100)}%` }}
          />
          <div 
            className="flex-1 bg-muted-foreground/50 rounded-t"
            style={{ height: `${Math.min((lastMonthRevenue / Math.max(projectedThisMonth, 1)) * 100, 100)}%` }}
          />
          <div 
            className="flex-1 bg-brand rounded-t"
            style={{ height: '100%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>2 mo ago</span>
          <span>Last</span>
          <span>This</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueForecast;
