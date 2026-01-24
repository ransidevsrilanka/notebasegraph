import { TrendingUp, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';

interface RevenueForecastProps {
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  twoWeeksAgoRevenue: number;
  daysIntoWeek: number; // 1-7 (Sunday = 0 counted as 7)
}

export const RevenueForecast = ({ 
  thisWeekRevenue, 
  lastWeekRevenue, 
  twoWeeksAgoRevenue,
  daysIntoWeek 
}: RevenueForecastProps) => {
  // Calculate weekly growth trend (last week vs two weeks ago)
  const growth1 = lastWeekRevenue > 0 && twoWeeksAgoRevenue > 0 
    ? ((lastWeekRevenue - twoWeeksAgoRevenue) / twoWeeksAgoRevenue) 
    : 0;
  
  // Project this week based on days passed (7 days in a week)
  const effectiveDays = daysIntoWeek > 0 ? daysIntoWeek : 1;
  const projectedThisWeek = effectiveDays > 0 
    ? Math.round((thisWeekRevenue / effectiveDays) * 7)
    : thisWeekRevenue;
  
  // Trend percentage vs last week
  const trendPercent = lastWeekRevenue > 0 
    ? Math.round(((projectedThisWeek - lastWeekRevenue) / lastWeekRevenue) * 100)
    : 0;
  
  const isPositiveTrend = trendPercent >= 0;

  // Forecast next week based on average growth
  const forecastNextWeek = Math.round(projectedThisWeek * (1 + growth1));

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-purple-400" />
        Revenue Forecast (Weekly)
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* This Week Projected */}
        <div className="p-4 rounded-xl bg-brand/10 border border-brand/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">This Week (Projected)</span>
            <div className={`flex items-center gap-1 text-xs ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
              {isPositiveTrend ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trendPercent)}%
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">Rs. {projectedThisWeek.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Current: Rs. {thisWeekRevenue.toLocaleString()} ({daysIntoWeek}/7 days)
          </p>
        </div>

        {/* Next Week Forecast */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Next Week (Forecast)</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">Rs. {forecastNextWeek.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {(growth1 * 100).toFixed(1)}% weekly trend
          </p>
        </div>
      </div>

      {/* Growth Trend Visual */}
      <div className="mt-4 p-3 rounded-lg bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Growth Trend (3 weeks)</span>
          <span className={isPositiveTrend ? 'text-green-500' : 'text-red-500'}>
            {isPositiveTrend ? '↗' : '↘'} {growth1 > 0 ? '+' : ''}{(growth1 * 100).toFixed(1)}% WoW
          </span>
        </div>
        <div className="flex items-end gap-2 h-12">
          <div 
            className="flex-1 bg-muted-foreground/30 rounded-t"
            style={{ height: `${Math.min((twoWeeksAgoRevenue / Math.max(projectedThisWeek, 1)) * 100, 100)}%` }}
          />
          <div 
            className="flex-1 bg-muted-foreground/50 rounded-t"
            style={{ height: `${Math.min((lastWeekRevenue / Math.max(projectedThisWeek, 1)) * 100, 100)}%` }}
          />
          <div 
            className="flex-1 bg-brand rounded-t"
            style={{ height: '100%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>2 wks ago</span>
          <span>Last wk</span>
          <span>This wk</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueForecast;
