import { Link } from 'react-router-dom';
import { Users, Share2, TrendingUp, Megaphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReferralNetworkStats {
  // User-to-User
  userSignups: number;
  userConversions: number;
  userRewardsClaimed: number;
  // Creators
  creatorSignups: number;
  creatorConversions: number;
  creatorRevenue: number;
  // CMOs
  totalCMOs: number;
  cmoCreators: number;
  cmoNetworkRevenue: number;
}

interface ReferralNetworkBreakdownProps {
  stats: ReferralNetworkStats;
}

export const ReferralNetworkBreakdown = ({ stats }: ReferralNetworkBreakdownProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-brand" />
        Referral Network Breakdown
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User-to-User Referrals */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-4 h-4 text-green-400" />
            </div>
            <h4 className="font-medium text-foreground text-sm">User-to-User</h4>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Signups</span>
              <span className="text-lg font-bold text-foreground">{stats.userSignups}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Converted</span>
              <span className="text-sm font-medium text-foreground">{stats.userConversions}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Rewards Claimed</span>
              <span className="text-sm font-medium text-green-400">{stats.userRewardsClaimed}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">
              Conversion Rate
            </p>
            <p className="text-xl font-bold text-green-400">
              {stats.userSignups > 0 
                ? Math.round((stats.userConversions / stats.userSignups) * 100) 
                : 0}%
            </p>
          </div>
        </div>

        {/* Creator Referrals */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <h4 className="font-medium text-foreground text-sm">Creators</h4>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Signups</span>
              <span className="text-lg font-bold text-foreground">{stats.creatorSignups}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Conversions</span>
              <span className="text-sm font-medium text-foreground">{stats.creatorConversions}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Revenue</span>
              <span className="text-sm font-medium text-purple-400">
                Rs. {stats.creatorRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/30">
            <Link to="/admin/analytics">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View Details <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CMO Network */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Megaphone className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="font-medium text-foreground text-sm">CMOs</h4>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Total CMOs</span>
              <span className="text-lg font-bold text-foreground">{stats.totalCMOs}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Creators Under CMOs</span>
              <span className="text-sm font-medium text-foreground">{stats.cmoCreators}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Network Revenue</span>
              <span className="text-sm font-medium text-amber-400">
                Rs. {stats.cmoNetworkRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/30">
            <Link to="/admin/analytics">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View Details <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
