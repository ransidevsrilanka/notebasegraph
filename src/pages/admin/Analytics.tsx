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
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Award,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { MiniChart } from '@/components/dashboard/MiniChart';

interface CMOData {
  id: string;
  user_id: string;
  display_name: string | null;
  referral_code: string | null;
  is_active: boolean | null;
  created_at: string;
  creators_count: number;
  total_paid_users: number;
  pending_earnings: number;
}

interface CreatorData {
  id: string;
  user_id: string;
  display_name: string | null;
  referral_code: string;
  cmo_id: string | null;
  cmo_name: string | null;
  lifetime_paid_users: number;
  monthly_paid_users: number;
  available_balance: number | null;
  commission_rate: number;
}

interface PlatformStats {
  totalCMOs: number;
  totalCreators: number;
  totalAttributedUsers: number;
  totalPaidUsersAllTime: number;
  totalCreatorBalances: number;
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
    totalPaidUsersAllTime: 0,
    totalCreatorBalances: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCMO, setExpandedCMO] = useState<string | null>(null);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  
  const [cmoDialogOpen, setCmoDialogOpen] = useState(false);
  const [newCMOEmail, setNewCMOEmail] = useState('');
  const [newCMOName, setNewCMOName] = useState('');
  const [isCreatingCMO, setIsCreatingCMO] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Fetch all creators
      const { data: creatorData } = await supabase
        .from('creator_profiles')
        .select('*')
        .order('lifetime_paid_users', { ascending: false });

      // Fetch all CMOs
      const { data: cmoData } = await supabase
        .from('cmo_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Batch fetch CMO names for creators
      const cmoIds = [...new Set((creatorData || []).map(c => c.cmo_id).filter(Boolean))];
      const cmoNameMap: Record<string, string> = {};
      if (cmoIds.length > 0) {
        const { data: cmoNames } = await supabase
          .from('cmo_profiles')
          .select('id, display_name')
          .in('id', cmoIds);
        (cmoNames || []).forEach(c => {
          cmoNameMap[c.id] = c.display_name || 'Unknown CMO';
        });
      }

      // Get all creator IDs for batch queries
      const creatorIds = (creatorData || []).map(c => c.id);

      // Batch fetch monthly payment counts
      const { data: monthlyPayments } = await supabase
        .from('payment_attributions')
        .select('creator_id')
        .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000'])
        .gte('created_at', currentMonth.toISOString());

      // Aggregate monthly counts
      const monthlyCountsByCreator: Record<string, number> = {};
      (monthlyPayments || []).forEach(p => {
        monthlyCountsByCreator[p.creator_id] = (monthlyCountsByCreator[p.creator_id] || 0) + 1;
      });

      // Enrich creators
      const enrichedCreators: CreatorData[] = (creatorData || []).map(creator => ({
        id: creator.id,
        user_id: creator.user_id,
        display_name: creator.display_name,
        referral_code: creator.referral_code,
        cmo_id: creator.cmo_id,
        cmo_name: creator.cmo_id ? cmoNameMap[creator.cmo_id] || 'Unknown CMO' : 'Direct',
        lifetime_paid_users: creator.lifetime_paid_users || 0,
        monthly_paid_users: monthlyCountsByCreator[creator.id] || 0,
        available_balance: creator.available_balance,
        commission_rate: (creator.lifetime_paid_users || 0) >= 500 ? 0.12 : 0.08,
      }));

      setCreators(enrichedCreators);

      // Enrich CMOs with stats
      const enrichedCMOs: CMOData[] = (cmoData || []).map(cmo => {
        const creatorsUnderCMO = enrichedCreators.filter(c => c.cmo_id === cmo.id);
        const totalPaidUsers = creatorsUnderCMO.reduce((sum, c) => sum + c.lifetime_paid_users, 0);
        const pendingEarnings = creatorsUnderCMO.reduce((sum, c) => sum + (c.available_balance || 0), 0) * 0.03;

        return {
          id: cmo.id,
          user_id: cmo.user_id,
          display_name: cmo.display_name,
          referral_code: cmo.referral_code,
          is_active: cmo.is_active,
          created_at: cmo.created_at,
          creators_count: creatorsUnderCMO.length,
          total_paid_users: totalPaidUsers,
          pending_earnings: pendingEarnings,
        };
      });

      setCMOs(enrichedCMOs);

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

      const totalPaidUsersAllTime = enrichedCreators.reduce((sum, c) => sum + c.lifetime_paid_users, 0);
      const totalCreatorBalances = enrichedCreators.reduce((sum, c) => sum + (c.available_balance || 0), 0);

      setStats({
        totalCMOs: enrichedCMOs.length,
        totalCreators: enrichedCreators.length,
        totalAttributedUsers: totalAttributed || 0,
        totalPaidUsersAllTime,
        totalCreatorBalances,
      });

      // Pie chart data
      setPieData([
        { name: 'Creators', value: enrichedCreators.length },
        { name: 'CMOs', value: enrichedCMOs.length },
      ]);

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
      let userId: string | null = null;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', newCMOEmail.toLowerCase().trim())
        .maybeSingle();

      if (profileData) {
        userId = profileData.user_id;
      } else {
        toast.error('User not found. They must sign up and log in at least once first.');
        setIsCreatingCMO(false);
        return;
      }

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

      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'cmo' });

      const refCode = `CMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
      })
      .eq('id', payout.id);

    if (error) {
      toast.error('Failed to mark as paid');
    } else {
      toast.success('Marked as paid');
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
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
              <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-display text-xl font-bold text-foreground">
                Referral Analytics
              </h1>
            </div>
            <Dialog open={cmoDialogOpen} onOpenChange={setCmoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-muted-foreground/30">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total CMOs" value={stats.totalCMOs} icon={Building2} />
          <StatCard label="Total Creators" value={stats.totalCreators} icon={Users} />
          <StatCard label="Attributed Users" value={stats.totalAttributedUsers} icon={TrendingUp} />
          <StatCard label="Paid Users (All Time)" value={stats.totalPaidUsersAllTime} icon={Award} />
          <StatCard label="Creator Balances" value={`Rs. ${stats.totalCreatorBalances.toLocaleString()}`} icon={DollarSign} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Network Distribution</h3>
            <MiniChart data={pieData} type="pie" height={200} />
          </div>
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Top Creators by Paid Users</h3>
            <MiniChart 
              data={creators.slice(0, 6).map(c => ({ 
                name: c.display_name?.substring(0, 10) || 'Unknown', 
                value: c.lifetime_paid_users 
              }))} 
              type="bar" 
              height={200}
              showAxis
            />
          </div>
        </div>

        <Tabs defaultValue="hierarchy" className="space-y-6">
          <TabsList className="bg-muted/50">
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
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedCMO(expandedCMO === cmo.id ? null : cmo.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-foreground/80" />
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
                        <p className="text-sm font-medium text-amber-400">
                          Rs. {cmo.pending_earnings.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">commission</p>
                      </div>
                      {expandedCMO === cmo.id ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {expandedCMO === cmo.id && (
                    <div className="border-t border-border bg-muted/20 p-4">
                      <p className="text-xs text-muted-foreground mb-3">Creators under {cmo.display_name}:</p>
                      <div className="space-y-2">
                        {creators
                          .filter(c => c.cmo_id === cmo.id)
                          .map((creator) => (
                            <div key={creator.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-foreground/80" />
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
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {Math.round(creator.commission_rate * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        {creators.filter(c => c.cmo_id === cmo.id).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No creators under this CMO yet
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="glass-card p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No CMOs yet</p>
              </div>
            )}

            {/* Direct Creators (no CMO) */}
            <div className="glass-card overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedCMO(expandedCMO === 'direct' ? null : 'direct')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-foreground/80" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Direct Creators</p>
                    <p className="text-xs text-muted-foreground">
                      {creators.filter(c => !c.cmo_id).length} creators without CMO
                    </p>
                  </div>
                </div>
                {expandedCMO === 'direct' ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              
              {expandedCMO === 'direct' && (
                <div className="border-t border-border bg-muted/20 p-4">
                  <div className="space-y-2">
                    {creators
                      .filter(c => !c.cmo_id)
                      .map((creator) => (
                        <div key={creator.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                              <Users className="w-4 h-4 text-foreground/80" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{creator.display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {creator.monthly_paid_users} this month • {creator.lifetime_paid_users} lifetime
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            creator.commission_rate === 0.12 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {Math.round(creator.commission_rate * 100)}%
                          </span>
                        </div>
                      ))}
                    {creators.filter(c => !c.cmo_id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No direct creators
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* All Creators */}
          <TabsContent value="creators">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creator</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">CMO</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Referral Code</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">This Month</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Lifetime</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Balance</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {creators.map((creator) => (
                      <tr key={creator.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3 text-sm text-foreground">
                          {creator.display_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {creator.cmo_name || 'Direct'}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-muted/50 px-2 py-1 rounded">
                            {creator.referral_code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{creator.monthly_paid_users}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{creator.lifetime_paid_users}</td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          Rs. {(creator.available_balance || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            creator.commission_rate === 0.12 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {Math.round(creator.commission_rate * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Pending Payouts */}
          <TabsContent value="payouts">
            <div className="glass-card overflow-hidden">
              {pendingPayouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Month</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendingPayouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              payout.type === 'cmo' 
                                ? 'bg-purple-500/20 text-purple-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {payout.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{payout.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{payout.payout_month}</td>
                          <td className="px-4 py-3 text-sm font-medium text-amber-400">
                            Rs. {payout.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                              {payout.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleMarkPaid(payout)}
                              className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Mark Paid
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending payouts</p>
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