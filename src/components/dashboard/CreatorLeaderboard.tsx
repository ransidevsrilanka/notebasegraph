import { Trophy, Medal, Award, Users, TrendingUp } from 'lucide-react';

interface Creator {
  id: string;
  display_name: string | null;
  referral_code: string;
  lifetime_paid_users: number;
  monthly_paid_users?: number;
  revenue: number;
}

interface CreatorLeaderboardProps {
  creators: Creator[];
  showMonthly?: boolean;
}

export const CreatorLeaderboard = ({ creators, showMonthly = false }: CreatorLeaderboardProps) => {
  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-gray-400" />;
      case 2: return <Award className="w-5 h-5 text-amber-600" />;
      default: return null;
    }
  };

  const getMedalBg = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500/10 border-yellow-500/30';
      case 1: return 'bg-gray-500/10 border-gray-500/30';
      case 2: return 'bg-amber-600/10 border-amber-600/30';
      default: return 'bg-muted/30 border-border';
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Creator Leaderboard
      </h3>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {creators.map((creator, index) => (
          <div 
            key={creator.id} 
            className={`flex items-center justify-between p-3 rounded-lg border ${getMedalBg(index)}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getMedalIcon(index) || (
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                )}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {creator.display_name || creator.referral_code}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {creator.lifetime_paid_users} lifetime
                  </span>
                  {showMonthly && creator.monthly_paid_users !== undefined && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {creator.monthly_paid_users} this month
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">Rs. {creator.revenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </div>
        ))}
        
        {creators.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No creators to display
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorLeaderboard;
