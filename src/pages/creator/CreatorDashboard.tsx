import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Users, 
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Copy,
  LogOut,
  CheckCircle2,
  Clock,
  Tag,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface CreatorProfile {
  id: string;
  display_name: string;
  referral_code: string;
  lifetime_paid_users: number;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  paid_conversions: number;
  is_active: boolean;
}

interface PayoutSummary {
  payout_month: string;
  paid_users_count: number;
  commission_amount: number;
  status: string;
}

interface Stats {
  totalUsersReferred: number;
  paidUsersThisMonth: number;
  paidUsersLifetime: number;
  pendingEarnings: number;
  paidEarnings: number;
  commissionRate: number;
}

const CreatorDashboard = () => {
  const { user, profile, isCreator, signOut } = useAuth();
  const navigate = useNavigate();
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [payouts, setPayouts] = useState<PayoutSummary[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsersReferred: 0,
    paidUsersThisMonth: 0,
    paidUsersLifetime: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    commissionRate: 0.08,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isCreator) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isCreator, navigate, user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch creator profile
      const { data: cpData, error: cpError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cpError) throw cpError;
      if (cpData) {
        setCreatorProfile(cpData);

        // Determine commission rate based on lifetime paid users
        const commissionRate = cpData.lifetime_paid_users >= 500 ? 0.12 : 0.08;

        // Fetch discount codes
        const { data: dcData } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('creator_id', cpData.id);
        setDiscountCodes(dcData || []);

        // Fetch user attributions count
        const { count: totalReferred } = await supabase
          .from('user_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', cpData.id);

        // Fetch payment attributions for this month
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const { count: paidThisMonth } = await supabase
          .from('payment_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', cpData.id)
          .gte('payment_month', currentMonth.toISOString().split('T')[0]);

        // Fetch payouts
        const { data: payoutData } = await supabase
          .from('creator_payouts')
          .select('*')
          .eq('creator_id', cpData.id)
          .order('payout_month', { ascending: false })
          .limit(12);

        setPayouts(payoutData || []);

        // Calculate earnings
        const pendingPayouts = (payoutData || []).filter(p => p.status !== 'paid');
        const paidPayouts = (payoutData || []).filter(p => p.status === 'paid');
        
        const pendingEarnings = pendingPayouts.reduce((sum, p) => sum + Number(p.commission_amount || 0), 0);
        const paidEarnings = paidPayouts.reduce((sum, p) => sum + Number(p.commission_amount || 0), 0);

        setStats({
          totalUsersReferred: totalReferred || 0,
          paidUsersThisMonth: paidThisMonth || 0,
          paidUsersLifetime: cpData.lifetime_paid_users || 0,
          pendingEarnings,
          paidEarnings,
          commissionRate,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    }
    setIsLoading(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const referralLink = creatorProfile 
    ? `${window.location.origin}/signup?ref_creator=${creatorProfile.referral_code}`
    : '';

  const isEligibleForPayout = stats.paidUsersThisMonth >= 100;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                <span className="text-brand">READ</span> VAULT
              </Link>
              <span className="px-2 py-1 rounded bg-brand/10 text-brand text-xs font-medium">
                Creator
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">{profile?.full_name || user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Welcome back, {creatorProfile?.display_name || 'Creator'}
          </h1>
          <p className="text-muted-foreground">
            Commission Rate: <span className="text-brand font-semibold">{stats.commissionRate * 100}%</span>
            {stats.paidUsersLifetime < 500 && (
              <span className="text-xs ml-2">
                ({500 - stats.paidUsersLifetime} more paid users until 12%)
              </span>
            )}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsersReferred}</p>
                <p className="text-muted-foreground text-sm">Total Referred</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.paidUsersThisMonth}</p>
                <p className="text-muted-foreground text-sm">Paid This Month</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {stats.pendingEarnings.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Pending Earnings</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {stats.paidEarnings.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Total Paid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Eligibility */}
        <div className={`glass-card p-4 mb-8 ${isEligibleForPayout ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'}`}>
          <div className="flex items-center gap-3">
            {isEligibleForPayout ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Clock className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isEligibleForPayout ? (
                  <span className="text-green-500">Eligible for payout this month!</span>
                ) : (
                  <span className="text-foreground">Not yet eligible for payout</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEligibleForPayout 
                  ? 'Your earnings will be processed when marked by admin.'
                  : `Need ${100 - stats.paidUsersThisMonth} more paid users this month (minimum 100 required)`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Link */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Your Referral Link</h2>
            </div>
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="bg-secondary text-foreground text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(referralLink, 'Referral link')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this link to earn commissions on every paid signup.
            </p>
          </div>

          {/* Discount Codes */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Your Discount Codes</h2>
            </div>
            {discountCodes.length > 0 ? (
              <div className="space-y-3">
                {discountCodes.map((dc) => (
                  <div key={dc.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-mono font-medium text-foreground">{dc.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {dc.discount_percent}% off • {dc.paid_conversions} conversions
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(dc.code, 'Discount code')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No discount codes assigned yet. Contact your CMO to get one.
              </p>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="glass-card p-6 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-foreground">Payout History</h2>
          </div>
          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Month</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Paid Users</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Commission</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.payout_month} className="border-b border-border/50">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {format(new Date(p.payout_month), 'MMMM yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{p.paid_users_count}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        LKR {Number(p.commission_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === 'paid' 
                            ? 'bg-green-500/20 text-green-500' 
                            : p.status === 'eligible'
                            ? 'bg-brand/20 text-brand'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payout records yet.</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default CreatorDashboard;