import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Users, 
  DollarSign,
  TrendingUp,
  ArrowLeft,
  UserPlus,
  Building2,
  Percent,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Award,
} from 'lucide-react';

interface CMOData {
  id: string;
  user_id: string;
  display_name: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  creators_count: number;
  total_paid_users: number;
  pending_earnings: number;
}

interface CreatorData {
  id: string;
  user_id: string;
  display_name: string;
  referral_code: string;
  cmo_name: string;
  lifetime_paid_users: number;
  monthly_paid_users: number;
  pending_earnings: number;
  commission_rate: number;
}

interface PlatformStats {
  totalCMOs: number;
  totalCreators: number;
  totalAttributedUsers: number;
  totalPaidUsersThisMonth: number;
  totalRevenue: number;
  totalCreatorCommissions: number;
  totalCMOCommissions: number;
  netProfit: number;
}

interface PayoutItem {
  id: string;
  type: 'creator' | 'cmo';
  name: string;
  payout_month: string;
  amount: number;
  status: string;
}

const Analytics = () => {
  const { user, signOut } = useAuth();
  const [cmos, setCMOs] = useState<CMOData[]>([]);
  const [creators, setCreators] = useState<CreatorData[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PayoutItem[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalCMOs: 0,
    totalCreators: 0,
    totalAttributedUsers: 0,
    totalPaidUsersThisMonth: 0,
    totalRevenue: 0,
    totalCreatorCommissions: 0,
    totalCMOCommissions: 0,
    netProfit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCMO, setExpandedCMO] = useState<string | null>(null);
  
  // CMO Creation Dialog
  const [cmoDialogOpen, setCmoDialogOpen] = useState(false);
  const [newCMOEmail, setNewCMOEmail] = useState('');
  const [newCMOName, setNewCMOName] = useState('');
  const [isCreatingCMO, setIsCreatingCMO] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch CMOs with stats
      const { data: cmoData, error: cmoError } = await supabase
        .from('cmo_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (cmoError) throw cmoError;

      // Enrich CMO data with stats
      const enrichedCMOs = await Promise.all(
        (cmoData || []).map(async (cmo) => {
          const { count: creatorsCount } = await supabase
            .from('creator_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('cmo_id', cmo.id);

          // Get total paid users from creators under this CMO
          const { data: creatorIds } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('cmo_id', cmo.id);

          let totalPaidUsers = 0;
          if (creatorIds && creatorIds.length > 0) {
            const { count } = await supabase
              .from('payment_attributions')
              .select('*', { count: 'exact', head: true })
              .in('creator_id', creatorIds.map(c => c.id));
            totalPaidUsers = count || 0;
          }

          // Get pending earnings
          const { data: payoutData } = await supabase
            .from('cmo_payouts')
            .select('total_commission')
            .eq('cmo_id', cmo.id)
            .neq('status', 'paid');

          const pendingEarnings = (payoutData || []).reduce(
            (sum, p) => sum + Number(p.total_commission || 0), 0
          );

          return {
            ...cmo,
            creators_count: creatorsCount || 0,
            total_paid_users: totalPaidUsers,
            pending_earnings: pendingEarnings,
          };
        })
      );

      setCMOs(enrichedCMOs);

      // Fetch all creators with stats
      const { data: creatorData } = await supabase
        .from('creator_profiles')
        .select(`
          *,
          cmo:cmo_profiles(display_name)
        `)
        .order('lifetime_paid_users', { ascending: false });

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const enrichedCreators = await Promise.all(
        (creatorData || []).map(async (creator) => {
          const { count: monthlyPaid } = await supabase
            .from('payment_attributions')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', creator.id)
            .gte('payment_month', currentMonth.toISOString().split('T')[0]);

          const { data: payoutData } = await supabase
            .from('creator_payouts')
            .select('commission_amount')
            .eq('creator_id', creator.id)
            .neq('status', 'paid');

          const pendingEarnings = (payoutData || []).reduce(
            (sum, p) => sum + Number(p.commission_amount || 0), 0
          );

          return {
            ...creator,
            cmo_name: creator.cmo?.display_name || 'Unknown',
            monthly_paid_users: monthlyPaid || 0,
            pending_earnings: pendingEarnings,
            commission_rate: creator.lifetime_paid_users >= 500 ? 0.12 : 0.08,
          };
        })
      );

      setCreators(enrichedCreators);

      // Fetch pending payouts
      const { data: creatorPayouts } = await supabase
        .from('creator_payouts')
        .select(`
          id,
          payout_month,
          commission_amount,
          status,
          creator:creator_profiles(display_name)
        `)
        .in('status', ['pending', 'eligible'])
        .order('payout_month', { ascending: false });

      const { data: cmoPayouts } = await supabase
        .from('cmo_payouts')
        .select(`
          id,
          payout_month,
          total_commission,
          status,
          cmo:cmo_profiles(display_name)
        `)
        .in('status', ['pending', 'eligible'])
        .order('payout_month', { ascending: false });

      const allPayouts: PayoutItem[] = [
        ...(creatorPayouts || []).map(p => ({
          id: p.id,
          type: 'creator' as const,
          name: p.creator?.display_name || 'Unknown',
          payout_month: p.payout_month,
          amount: Number(p.commission_amount || 0),
          status: p.status,
        })),
        ...(cmoPayouts || []).map(p => ({
          id: p.id,
          type: 'cmo' as const,
          name: p.cmo?.display_name || 'Unknown',
          payout_month: p.payout_month,
          amount: Number(p.total_commission || 0),
          status: p.status,
        })),
      ];

      setPendingPayouts(allPayouts);

      // Calculate platform stats
      const { count: totalAttributed } = await supabase
        .from('user_attributions')
        .select('*', { count: 'exact', head: true });

      const { count: paidThisMonth } = await supabase
        .from('payment_attributions')
        .select('*', { count: 'exact', head: true })
        .gte('payment_month', currentMonth.toISOString().split('T')[0]);

      setStats({
        totalCMOs: enrichedCMOs.length,
        totalCreators: enrichedCreators.length,
        totalAttributedUsers: totalAttributed || 0,
        totalPaidUsersThisMonth: paidThisMonth || 0,
        totalRevenue: 0, // Would need to calculate from platform_financials
        totalCreatorCommissions: enrichedCreators.reduce((s, c) => s + c.pending_earnings, 0),
        totalCMOCommissions: enrichedCMOs.reduce((s, c) => s + c.pending_earnings, 0),
        netProfit: 0,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    }
    setIsLoading(false);
  };

  const handleCreateCMO = async () => {
    if (!newCMOEmail || !newCMOName) {
      toast.error('Please enter email and name');
      return;
    }

    setIsCreatingCMO(true);

    try {
      // Find user by email in auth.users via profiles table
      // If profile doesn't exist, we need to check auth.users directly via a different method
      let userId: string | null = null;
      
      // First try profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newCMOEmail.toLowerCase().trim())
        .maybeSingle();

      if (profileData) {
        userId = profileData.id;
      } else {
        // Profile doesn't exist - inform user to have them sign up first
        toast.error('User not found. They must sign up and log in at least once first.');
        setIsCreatingCMO(false);
        return;
      }

      if (!userId) {
        toast.error('Could not find user. Please verify the email address.');
        setIsCreatingCMO(false);
        return;
      }

      // Check if already a CMO
      const { data: existingCMO } = await supabase
        .from('cmo_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCMO) {
        toast.error('This user is already a CMO');
        setIsCreatingCMO(false);
        return;
      }

      // Add CMO role
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'cmo' });

      // Generate referral code
      const refCode = `CMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create CMO profile
      const { error: cmoError } = await supabase
        .from('cmo_profiles')
        .insert({
          user_id: userId,
          display_name: newCMOName,
          referral_code: refCode,
        });

      if (cmoError) throw cmoError;

      toast.success('CMO created successfully');
      setCmoDialogOpen(false);
      setNewCMOEmail('');
      setNewCMOName('');
      fetchData();

    } catch (error) {
      console.error('Error creating CMO:', error);
      toast.error('Failed to create CMO');
    }

    setIsCreatingCMO(false);
  };

  const handleMarkPaid = async (payout: PayoutItem) => {
    const table = payout.type === 'creator' ? 'creator_payouts' : 'cmo_payouts';
    
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString(),
        paid_by: user?.id 
      })
      .eq('id', payout.id);

    if (error) {
      toast.error('Failed to mark as paid');
    } else {
      toast.success('Marked as paid');
      fetchData();
    }
  };

  const getCreatorsForCMO = (cmoId: string) => {
    return creators.filter(c => {
      const cmoProfile = cmos.find(cmo => cmo.id === cmoId);
      if (!cmoProfile) return false;
      // We need to check the cmo_id on creator
      return true; // Simplified - would need proper join
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
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
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-display text-xl font-bold text-foreground">
                Referral Analytics
              </h1>
            </div>
            <Dialog open={cmoDialogOpen} onOpenChange={setCmoDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add CMO
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New CMO</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>User Email (must be registered)</Label>
                    <Input 
                      placeholder="cmo@example.com"
                      value={newCMOEmail}
                      onChange={(e) => setNewCMOEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input 
                      placeholder="John Doe"
                      value={newCMOName}
                      onChange={(e) => setNewCMOName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCmoDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateCMO} disabled={isCreatingCMO}>
                    {isCreatingCMO ? 'Creating...' : 'Create CMO'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalCMOs}</p>
                <p className="text-muted-foreground text-sm">Total CMOs</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
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
                <p className="text-2xl font-bold text-foreground">{stats.totalAttributedUsers}</p>
                <p className="text-muted-foreground text-sm">Attributed Users</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  LKR {(stats.totalCreatorCommissions + stats.totalCMOCommissions).toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm">Pending Payouts</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="hierarchy" className="space-y-6">
          <TabsList>
            <TabsTrigger value="hierarchy">CMO → Creator Hierarchy</TabsTrigger>
            <TabsTrigger value="creators">All Creators</TabsTrigger>
            <TabsTrigger value="payouts">Pending Payouts</TabsTrigger>
          </TabsList>

          {/* Hierarchy View */}
          <TabsContent value="hierarchy" className="space-y-4">
            {cmos.length > 0 ? (
              cmos.map((cmo) => (
                <div key={cmo.id} className="glass-card overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                    onClick={() => setExpandedCMO(expandedCMO === cmo.id ? null : cmo.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{cmo.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cmo.creators_count} creators • {cmo.total_paid_users} paid users
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-brand">
                          LKR {cmo.pending_earnings.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">pending</p>
                      </div>
                      {expandedCMO === cmo.id ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {expandedCMO === cmo.id && (
                    <div className="border-t border-border bg-secondary/30 p-4">
                      <p className="text-xs text-muted-foreground mb-3">Creators under {cmo.display_name}:</p>
                      <div className="space-y-2">
                        {creators
                          .filter(c => c.cmo_name === cmo.display_name)
                          .map((creator) => (
                            <div key={creator.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-brand" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{creator.display_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {creator.monthly_paid_users} this month • {creator.lifetime_paid_users} lifetime
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  creator.commission_rate === 0.12 
                                    ? 'bg-green-500/20 text-green-500' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {creator.commission_rate * 100}%
                                </span>
                                <p className="text-sm font-medium text-brand">
                                  LKR {creator.pending_earnings.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        {creators.filter(c => c.cmo_name === cmo.display_name).length === 0 && (
                          <p className="text-sm text-muted-foreground">No creators yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="glass-card p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No CMOs yet. Click "Add CMO" to get started.</p>
              </div>
            )}
          </TabsContent>

          {/* All Creators View */}
          <TabsContent value="creators">
            <div className="glass-card overflow-hidden">
              {creators.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Creator</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">CMO</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">This Month</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Lifetime</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rate</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creators.map((creator) => (
                      <tr key={creator.id} className="border-b border-border/50">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-foreground">{creator.display_name}</p>
                          <p className="text-xs text-muted-foreground">{creator.referral_code}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{creator.cmo_name}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{creator.monthly_paid_users}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{creator.lifetime_paid_users}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            creator.commission_rate === 0.12 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {creator.commission_rate * 100}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-brand">
                          LKR {creator.pending_earnings.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No creators yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pending Payouts */}
          <TabsContent value="payouts">
            <div className="glass-card overflow-hidden">
              {pendingPayouts.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Month</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayouts.map((payout) => (
                      <tr key={`${payout.type}-${payout.id}`} className="border-b border-border/50">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{payout.name}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            payout.type === 'cmo' 
                              ? 'bg-purple-500/20 text-purple-500' 
                              : 'bg-brand/20 text-brand'
                          }`}>
                            {payout.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {format(new Date(payout.payout_month), 'MMM yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          LKR {payout.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                            payout.status === 'eligible' 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {payout.status === 'eligible' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMarkPaid(payout)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Mark Paid
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending payouts.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Analytics;