import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatCard from '@/components/dashboard/StatCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Gift, Crown, Star, UserCheck, ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ReferrerData {
  user_id: string;
  email: string;
  full_name: string | null;
  referral_code: string;
  total_referrals: number;
  paid_referrals: number;
  reward_status: 'none' | 'unlocked' | 'claimed';
}

interface Stats {
  totalReferrers: number;
  totalReferrals: number;
  paidConversions: number;
  rewardsClaimed: number;
  rewardsUnlocked: number;
}

const UserReferrals = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [referrers, setReferrers] = useState<ReferrerData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReferrers: 0,
    totalReferrals: 0,
    paidConversions: 0,
    rewardsClaimed: 0,
    rewardsUnlocked: 0,
  });
  const [sidebarStats, setSidebarStats] = useState({
    pendingJoinRequests: 0,
    pendingUpgrades: 0,
    pendingWithdrawals: 0,
    pendingHeadOpsRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    fetchSidebarStats();
  }, []);

  const fetchSidebarStats = async () => {
    const [upgradeRequests, withdrawalRequests] = await Promise.all([
      supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    setSidebarStats({
      pendingJoinRequests: 0,
      pendingUpgrades: upgradeRequests.count || 0,
      pendingWithdrawals: withdrawalRequests.count || 0,
      pendingHeadOpsRequests: 0,
    });
  };

  const fetchData = async () => {
    setIsLoading(true);

    // Get all profiles with referral codes (these are potential referrers)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, referral_code')
      .not('referral_code', 'is', null);

    if (!profiles) {
      setIsLoading(false);
      return;
    }

    // Get all user attributions (signups via referral)
    const { data: attributions } = await supabase
      .from('user_attributions')
      .select('id, user_id, referral_source');

    // Get all payment attributions for paid referrals
    const { data: paymentAttributions } = await supabase
      .from('payment_attributions')
      .select('user_id');

    // Get all referral rewards
    const { data: rewards } = await supabase
      .from('referral_rewards')
      .select('user_id, is_claimed');

    // Build referrer data
    const referrerMap = new Map<string, ReferrerData>();
    
    profiles.forEach(profile => {
      if (profile.referral_code) {
        referrerMap.set(profile.referral_code, {
          user_id: profile.user_id,
          email: profile.email || 'Unknown',
          full_name: profile.full_name,
          referral_code: profile.referral_code,
          total_referrals: 0,
          paid_referrals: 0,
          reward_status: 'none',
        });
      }
    });

    // Count referrals for each referrer
    const paidUserIds = new Set(paymentAttributions?.map(pa => pa.user_id) || []);
    
    attributions?.forEach(attr => {
      if (attr.referral_source && referrerMap.has(attr.referral_source)) {
        const referrer = referrerMap.get(attr.referral_source)!;
        referrer.total_referrals++;
        if (paidUserIds.has(attr.user_id)) {
          referrer.paid_referrals++;
        }
      }
    });

    // Add reward status
    rewards?.forEach(reward => {
      const profile = profiles.find(p => p.user_id === reward.user_id);
      if (profile?.referral_code && referrerMap.has(profile.referral_code)) {
        const referrer = referrerMap.get(profile.referral_code)!;
        referrer.reward_status = reward.is_claimed ? 'claimed' : 'unlocked';
      }
    });

    // Convert to array and sort by paid referrals
    const referrerList = Array.from(referrerMap.values())
      .filter(r => r.total_referrals > 0 || r.paid_referrals > 0 || r.reward_status !== 'none')
      .sort((a, b) => b.paid_referrals - a.paid_referrals);

    setReferrers(referrerList);

    // Calculate stats
    const totalReferrers = referrerList.length;
    const totalReferrals = referrerList.reduce((sum, r) => sum + r.total_referrals, 0);
    const paidConversions = referrerList.reduce((sum, r) => sum + r.paid_referrals, 0);
    const rewardsUnlocked = referrerList.filter(r => r.reward_status === 'unlocked').length;
    const rewardsClaimed = referrerList.filter(r => r.reward_status === 'claimed').length;

    setStats({
      totalReferrers,
      totalReferrals,
      paidConversions,
      rewardsUnlocked,
      rewardsClaimed,
    });

    setIsLoading(false);
  };

  const getRewardBadge = (status: string, paidReferrals: number) => {
    if (status === 'claimed') {
      return <Badge className="bg-gold/20 text-gold border-gold/30">Claimed</Badge>;
    }
    if (status === 'unlocked') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Unlocked</Badge>;
    }
    if (paidReferrals >= 5) {
      return <Badge className="bg-brand/20 text-brand border-brand/30">Ready</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">In Progress</Badge>;
  };

  const filteredReferrers = referrers.filter(r => 
    r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar stats={sidebarStats} />
        
        <main className="flex-1 overflow-auto admin-premium-bg">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <button
                  onClick={() => navigate('/admin')}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    User-to-User Referrals
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Track peer referral performance and reward status
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <StatCard
                label="Total Referrers"
                value={stats.totalReferrers}
                icon={Users}
                iconColor="blue"
              />
              <StatCard
                label="Total Signups"
                value={stats.totalReferrals}
                icon={UserCheck}
                iconColor="green"
              />
              <StatCard
                label="Paid Conversions"
                value={stats.paidConversions}
                icon={Star}
                iconColor="amber"
              />
              <StatCard
                label="Rewards Unlocked"
                value={stats.rewardsUnlocked}
                icon={Gift}
                iconColor="purple"
              />
              <StatCard
                label="Rewards Claimed"
                value={stats.rewardsClaimed}
                icon={Crown}
                iconColor="amber"
              />
            </div>

            {/* Search */}
            <div className="glass-card-premium p-6 mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name, or referral code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/30 border-border/50"
                />
              </div>
            </div>

            {/* Referrers Table */}
            <div className="glass-card-premium p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Referrer Performance</h2>
              
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : filteredReferrers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No referral activity yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30">
                        <TableHead>User</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead className="text-center">Signups</TableHead>
                        <TableHead className="text-center">Paid</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Reward Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReferrers.map((referrer) => (
                        <TableRow key={referrer.user_id} className="border-border/20">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {referrer.full_name || 'Anonymous'}
                              </p>
                              <p className="text-sm text-muted-foreground">{referrer.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="px-2 py-1 bg-secondary/50 rounded text-xs">
                              {referrer.referral_code}
                            </code>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{referrer.total_referrals}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-gold">{referrer.paid_referrals}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress 
                                value={Math.min((referrer.paid_referrals / 5) * 100, 100)} 
                                className="h-2 flex-1" 
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {referrer.paid_referrals}/5
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getRewardBadge(referrer.reward_status, referrer.paid_referrals)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default UserReferrals;
