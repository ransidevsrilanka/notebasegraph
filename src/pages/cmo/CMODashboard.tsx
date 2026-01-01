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
  Target,
  CheckCircle2,
  Circle,
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
  available_balance: number;
  is_active: boolean;
  created_at: string;
  discount_codes: { code: string; paid_conversions: number }[];
  monthly_paid_users: number;
}

interface Stats {
  totalCreators: number;
  totalPaidUsersThisMonth: number;
  totalBusinessRevenue: number;
  estimatedPayout: number;
  commissionRate: number;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
  description: string;
}

const CMODashboard = () => {
  const { user, profile, isCMO, signOut } = useAuth();
  const navigate = useNavigate();
  const [cmoProfile, setCmoProfile] = useState<CMOProfile | null>(null);
  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCreators: 0,
    totalPaidUsersThisMonth: 0,
    totalBusinessRevenue: 0,
    estimatedPayout: 0,
    commissionRate: 0.05,
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
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

          // Fetch total business revenue
          const { data: allPayments } = await supabase
            .from('payment_attributions')
            .select('final_amount');

          const totalBusinessRevenue = (allPayments || []).reduce(
            (sum, p) => sum + Number(p.final_amount || 0), 0
          );

          // CMO commission: 5% base, +5% if 1000 creators goal met
          const bonusEligible = creatorsWithStats.length >= 1000;
          const commissionRate = bonusEligible ? 0.10 : 0.05;
          const estimatedPayout = totalBusinessRevenue * commissionRate;

          setStats({
            totalCreators: creatorsWithStats.length,
            totalPaidUsersThisMonth: totalPaidThisMonth,
            totalBusinessRevenue,
            estimatedPayout,
            commissionRate,
          });

          // Set goals
          const creatorCount = creatorsWithStats.length;
          setGoals([
            {
              id: '1',
              title: 'Get 5 active creators',
              target: 5,
              current: creatorCount,
              completed: creatorCount >= 5,
              description: 'Onboard your first 5 content creators',
            },
            {
              id: '2',
              title: 'Get 20 active creators',
              target: 20,
              current: creatorCount,
              completed: creatorCount >= 20,
              description: 'Build a solid creator base',
            },
            {
              id: '3',
              title: 'Get 100 active creators',
              target: 100,
              current: creatorCount,
              completed: creatorCount >= 100,
              description: 'Scale your creator network',
            },
            {
              id: '4',
              title: 'Reach 1000 creators for +5% bonus',
              target: 1000,
              current: creatorCount,
              completed: creatorCount >= 1000,
              description: 'Unlock the 5% bonus commission (10% total)',
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    }
    setLastUpdated(new Date());
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

  const referralLink = cmoProfile?.referral_code
    ? `${window.location.origin}/creator-signup?ref_cmo=${cmoProfile.referral_code}`
    : '';

  // CMO bonus eligibility: 1000 creators goal
  const bonusEligible = stats.totalCreators >= 1000;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme">
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
        {/* Last Updated Timestamp */}
        <div className="flex items-center justify-end mb-2">
          <p className="text-xs text-muted-foreground">
            {lastUpdated ? `Last updated: ${format(lastUpdated, 'PPp')}` : ''}
          </p>
        </div>

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            CMO Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your content creators and track business performance
          </p>
        </div>

        {/* Stats Cards - Updated without commission display */}
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
                <p className="text-2xl font-bold text-foreground">LKR {stats.totalBusinessRevenue.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Total Business Revenue</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {stats.estimatedPayout.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">
                  Estimated Payout ({stats.commissionRate * 100}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-foreground">Goals & Milestones</h2>
          </div>
          <div className="space-y-4">
            {goals.map((goal) => (
              <div 
                key={goal.id} 
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  goal.completed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                {goal.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${goal.completed ? 'text-green-500' : 'text-foreground'}`}>
                    {goal.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{goal.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-medium ${goal.completed ? 'text-green-500' : 'text-foreground'}`}>
                    {goal.current}/{goal.target}
                  </p>
                  {!goal.completed && (
                    <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
                      <div 
                        className="h-full bg-brand rounded-full transition-all"
                        style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus Eligibility - 1000 creators goal */}
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
                  ? 'You have 1000+ creators! You earn 10% of total business revenue.'
                  : `Need ${1000 - stats.totalCreators} more creators for +5% bonus (currently 5% of business revenue)`}
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
          {referralLink ? (
            <>
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
            </>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-500 text-sm font-medium">CMO profile not fully initialized</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please contact admin to generate your referral code.
              </p>
            </div>
          )}
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Balance</th>
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
                      <td className="py-3 px-4 text-sm text-foreground">
                        LKR {(creator.available_balance || 0).toLocaleString()}
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
      </div>
    </main>
  );
};

export default CMODashboard;
