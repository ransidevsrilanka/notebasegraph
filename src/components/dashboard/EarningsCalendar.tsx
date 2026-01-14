import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths } from 'date-fns';

interface DailyEarning {
  date: string; // YYYY-MM-DD
  amount: number;
}

interface EarningsCalendarProps {
  earnings: DailyEarning[];
}

export const EarningsCalendar = ({ earnings }: EarningsCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Create a map of date -> amount for quick lookup
  const earningsMap = useMemo(() => {
    const map: Record<string, number> = {};
    earnings.forEach(e => {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });
    return map;
  }, [earnings]);

  // Get max earnings for color intensity calculation
  const maxEarning = useMemo(() => {
    return Math.max(...Object.values(earningsMap), 1);
  }, [earningsMap]);

  // Generate days for the calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the starting day of week (0 = Sunday)
  const startDay = monthStart.getDay();

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    return days.reduce((sum, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return sum + (earningsMap[dateKey] || 0);
    }, 0);
  }, [days, earningsMap]);

  const getColorIntensity = (amount: number) => {
    if (amount === 0) return 'bg-muted/30';
    const intensity = Math.min(amount / maxEarning, 1);
    if (intensity < 0.25) return 'bg-green-500/20';
    if (intensity < 0.5) return 'bg-green-500/40';
    if (intensity < 0.75) return 'bg-green-500/60';
    return 'bg-green-500/80';
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-400" />
          Earnings Calendar
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Monthly Total */}
      <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
        <p className="text-xs text-muted-foreground">Monthly Total</p>
        <p className="text-xl font-bold text-green-500">LKR {monthlyTotal.toLocaleString()}</p>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month start */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const amount = earningsMap[dateKey] || 0;
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateKey}
              className={`aspect-square rounded-md flex flex-col items-center justify-center cursor-default transition-colors relative group ${getColorIntensity(amount)} ${isCurrentDay ? 'ring-2 ring-brand' : ''}`}
              title={`${format(day, 'MMM d')}: LKR ${amount.toLocaleString()}`}
            >
              <span className={`text-xs ${amount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {format(day, 'd')}
              </span>
              
              {/* Tooltip on hover */}
              {amount > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="bg-popover border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                    LKR {amount.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-muted/30" />
          <div className="w-3 h-3 rounded bg-green-500/20" />
          <div className="w-3 h-3 rounded bg-green-500/40" />
          <div className="w-3 h-3 rounded bg-green-500/60" />
          <div className="w-3 h-3 rounded bg-green-500/80" />
        </div>
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  );
};

export default EarningsCalendar;
