import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Users, 
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Copy,
  LogOut,
  Plus,
  Tag,
  Calendar,
  Award,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';

interface CMOProfile {
  id: string;
  display_name: string;
  referral_code: string;
}

interface CreatorWithStats {
  id: string;
  user_id: string;
  display_name: string;
  referral_code: string;
  lifetime_paid_users: number;
  is_active: boolean;
  created_at: string;
  discount_codes: { code: string; paid_conversions: number }[];
  monthly_paid_users: number;
}

interface CMOPayoutSummary {
  payout_month: string;
  total_paid_users: number;
  base_commission_amount: number;
  bonus_amount: number;
  total_commission: number;
  status: string;
}

interface Stats {
  totalCreators: number;
  totalPaidUsersThisMonth: number;
  baseCommission: number;
  bonusCommission: number;
  pendingEarnings: number;
  paidEarnings: number;
}

const CMODashboard = () => {
  const { user, profile, isCMO, signOut } = useAuth();
  const navigate = useNavigate();
  const [cmoProfile, setCmoProfile] = useState<CMOProfile | null>(null);
  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [payouts, setPayouts] = useState<CMOPayoutSummary[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCreators: 0,
    totalPaidUsersThisMonth: 0,
    baseCommission: 0,
    bonusCommission: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Discount code creation
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [newCodeValue, setNewCodeValue] = useState('');
  const [isAutoGenerate, setIsAutoGenerate] = useState(true);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isCMO) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isCMO, navigate, user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch CMO profile
      const { data: cmoData, error: cmoError } = await supabase
        .from('cmo_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cmoError) throw cmoError;
      if (cmoData) {
        setCmoProfile(cmoData);

        // Fetch creators under this CMO
        const { data: creatorsData } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('cmo_id', cmoData.id)
          .order('created_at', { ascending: false });

        if (creatorsData) {
          // Fetch discount codes and monthly stats for each creator
          const creatorsWithStats = await Promise.all(
            creatorsData.map(async (creator) => {
              const { data: dcData } = await supabase
                .from('discount_codes')
                .select('code, paid_conversions')
                .eq('creator_id', creator.id);

              const currentMonth = new Date();
              currentMonth.setDate(1);
              currentMonth.setHours(0, 0, 0, 0);
              
              const { count: monthlyPaid } = await supabase
                .from('payment_attributions')
                .select('*', { count: 'exact', head: true })
                .eq('creator_id', creator.id)
                .gte('payment_month', currentMonth.toISOString().split('T')[0]);

              return {
                ...creator,
                discount_codes: dcData || [],
                monthly_paid_users: monthlyPaid || 0,
              };
            })
          );

          setCreators(creatorsWithStats);

          // Calculate stats
          const totalPaidThisMonth = creatorsWithStats.reduce((sum, c) => sum + c.monthly_paid_users, 0);
          const bonusEligible = totalPaidThisMonth >= 500;

          setStats(prev => ({
            ...prev,
            totalCreators: creatorsWithStats.length,
            totalPaidUsersThisMonth: totalPaidThisMonth,
            bonusCommission: bonusEligible ? 0.05 : 0,
          }));
        }

        // Fetch CMO payouts
        const { data: payoutData } = await supabase
          .from('cmo_payouts')
          .select('*')
          .eq('cmo_id', cmoData.id)
          .order('payout_month', { ascending: false })
          .limit(12);

        setPayouts(payoutData || []);

        // Calculate earnings
        const pendingPayouts = (payoutData || []).filter(p => p.status !== 'paid');
        const paidPayouts = (payoutData || []).filter(p => p.status === 'paid');
        
        const pendingEarnings = pendingPayouts.reduce((sum, p) => sum + Number(p.total_commission || 0), 0);
        const paidEarnings = paidPayouts.reduce((sum, p) => sum + Number(p.total_commission || 0), 0);

        setStats(prev => ({
          ...prev,
          pendingEarnings,
          paidEarnings,
        }));
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

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'DC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateDiscountCode = async () => {
    if (!selectedCreatorId) return;

    const codeValue = isAutoGenerate ? generateCode() : newCodeValue.toUpperCase();
    
    if (!codeValue || codeValue.length < 3) {
      toast.error('Please enter a valid discount code');
      return;
    }

    setIsCreatingCode(true);

    const { error } = await supabase
      .from('discount_codes')
      .insert({
        code: codeValue,
        creator_id: selectedCreatorId,
        discount_percent: 10,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This discount code already exists');
      } else {
        toast.error('Failed to create discount code');
      }
    } else {
      toast.success('Discount code created');
      setDialogOpen(false);
      setNewCodeValue('');
      fetchData();
    }

    setIsCreatingCode(false);
  };

  const referralLink = cmoProfile 
    ? `${window.location.origin}/creator_signup?ref_cmo=${cmoProfile.referral_code}`
    : '';

  const bonusEligible = stats.totalPaidUsersThisMonth >= 500;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background dashboard-dark flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-dark">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                CMO Dashboard
              </Link>
              <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                CMO
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm hidden sm:block">{profile?.full_name || user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
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
            CMO Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your content creators and track performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalCreators}</p>
                <p className="text-muted-foreground text-sm">Total Creators</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalPaidUsersThisMonth}</p>
                <p className="text-muted-foreground text-sm">Paid Users This Month</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {stats.pendingEarnings.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Pending Earnings</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {stats.paidEarnings.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Total Paid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bonus Eligibility */}
        <div className={`glass-card p-4 mb-8 ${bonusEligible ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'}`}>
          <div className="flex items-center gap-3">
            <Award className={`w-5 h-5 ${bonusEligible ? 'text-green-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">
                {bonusEligible ? (
                  <span className="text-green-500">+5% Performance Bonus Active!</span>
                ) : (
                  <span className="text-foreground">Performance Bonus Not Active</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {bonusEligible 
                  ? 'Your creators brought 500+ paid users this month. You earn 8% base + 5% bonus.'
                  : `Need ${500 - stats.totalPaidUsersThisMonth} more collective paid users for +5% bonus`}
              </p>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Recruit Content Creators</h2>
            </div>
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
            Share this link to onboard new content creators under your management.
          </p>
        </div>

        {/* Creator Leaderboard */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Your Creators</h2>
            </div>
          </div>
          {creators.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Creator</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">This Month</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Lifetime</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Commission</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Discount Codes</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creators.map((creator) => (
                    <tr key={creator.id} className="border-b border-border/50">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-foreground">{creator.display_name}</p>
                        <p className="text-xs text-muted-foreground">{creator.referral_code}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{creator.monthly_paid_users}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{creator.lifetime_paid_users}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          creator.lifetime_paid_users >= 500 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {creator.lifetime_paid_users >= 500 ? '12%' : '8%'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {creator.discount_codes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {creator.discount_codes.map((dc) => (
                              <span key={dc.code} className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded">
                                {dc.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Dialog open={dialogOpen && selectedCreatorId === creator.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (open) setSelectedCreatorId(creator.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Tag className="w-4 h-4 mr-1" />
                              Add Code
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Discount Code for {creator.display_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="flex items-center gap-4">
                                <Button 
                                  variant={isAutoGenerate ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setIsAutoGenerate(true)}
                                >
                                  Auto-generate
                                </Button>
                                <Button 
                                  variant={!isAutoGenerate ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setIsAutoGenerate(false)}
                                >
                                  Custom
                                </Button>
                              </div>
                              {!isAutoGenerate && (
                                <div>
                                  <Label>Custom Code</Label>
                                  <Input 
                                    placeholder="MYCODE10"
                                    value={newCodeValue}
                                    onChange={(e) => setNewCodeValue(e.target.value.toUpperCase())}
                                    className="mt-1"
                                  />
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                This code will give users 10% off and track conversions for this creator.
                              </p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleCreateDiscountCode} disabled={isCreatingCode}>
                                {isCreatingCode ? 'Creating...' : 'Create Code'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No creators yet. Share your referral link to onboard creators.</p>
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-foreground">Your Payout History</h2>
          </div>
          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Month</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Paid Users</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Base (8%)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Bonus (5%)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.payout_month} className="border-b border-border/50">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {format(new Date(p.payout_month), 'MMMM yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{p.total_paid_users}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        LKR {Number(p.base_commission_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        LKR {Number(p.bonus_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        LKR {Number(p.total_commission || 0).toLocaleString()}
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

export default CMODashboard;