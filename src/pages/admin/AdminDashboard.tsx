import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Users, 
  Key, 
  BookOpen, 
  Shield,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  LogOut,
  Crown,
  DollarSign,
  Palette,
  Trash2,
  BarChart3,
  Wallet,
  RefreshCw,
  GitCompare,
  CreditCard,
  Building2,
  Settings,
  Target,
  FileCheck,
  Search,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { MiniChart } from '@/components/dashboard/MiniChart';
import { ChartLegend } from '@/components/dashboard/ChartLegend';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { format } from 'date-fns';

interface Stats {
  totalStudents: number;
  totalCreators: number;
  activeEnrollments: number;
  totalCodes: number;
  activeCodes: number;
  totalSubjects: number;
  pendingUpgrades: number;
  pendingJoinRequests: number;
  pendingWithdrawals: number;
  pendingHeadOpsRequests: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  starterCount: number;
  standardCount: number;
  lifetimeCount: number;
  cardPayments: number;
  bankPayments: number;
  currentPhase: number;
  phaseName: string;
}

interface TopCreator {
  id: string;
  display_name: string;
  referral_code: string;
  lifetime_paid_users: number;
  revenue: number;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalCreators: 0,
    activeEnrollments: 0,
    totalCodes: 0,
    activeCodes: 0,
    totalSubjects: 0,
    pendingUpgrades: 0,
    pendingJoinRequests: 0,
    pendingWithdrawals: 0,
    pendingHeadOpsRequests: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    starterCount: 0,
    standardCount: 0,
    lifetimeCount: 0,
    cardPayments: 0,
    bankPayments: 0,
    currentPhase: 1,
    phaseName: 'Phase 1',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [revenueData, setRevenueData] = useState<{ name: string; value: number }[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{ name: string; value: number }[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      // Get non-student user IDs (creators, admins, CMOs)
      const { data: nonStudentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin', 'content_admin', 'support_admin', 'creator', 'cmo']);
      
      const nonStudentUserIds = new Set((nonStudentRoles || []).map(r => r.user_id));

      const [
        { data: allEnrollments },
        { count: activeEnrollments },
        { count: totalCodes },
        { count: activeCodes },
        { count: totalSubjects },
        { count: pendingUpgrades },
        { count: pendingJoinRequests },
        { count: pendingWithdrawals },
        { count: pendingHeadOpsRequests },
        { count: totalCreators },
        { data: enrollmentTiers },
        { data: businessPhase },
      ] = await Promise.all([
        supabase.from('enrollments').select('user_id').eq('is_active', true),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('head_ops_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('tier').eq('is_active', true),
        supabase.from('business_phases').select('*').limit(1).maybeSingle(),
      ]);

      // Count students = active enrollments excluding non-student roles
      const totalStudents = (allEnrollments || []).filter(
        e => !nonStudentUserIds.has(e.user_id)
      ).length;

      // Count tiers
      const starterCount = (enrollmentTiers || []).filter(e => e.tier === 'starter').length;
      const standardCount = (enrollmentTiers || []).filter(e => e.tier === 'standard').length;
      const lifetimeCount = (enrollmentTiers || []).filter(e => e.tier === 'lifetime').length;

      // Fetch revenue data from payment_attributions
      const { data: allPayments } = await supabase
        .from('payment_attributions')
        .select('final_amount, payment_month, payment_type');

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // Payment method breakdown
      const cardPayments = (allPayments || [])
        .filter(p => p.payment_type === 'card')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      const bankPayments = (allPayments || [])
        .filter(p => p.payment_type === 'bank')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // This month's revenue
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const currentMonthStr = currentMonth.toISOString().split('T')[0];
      const thisMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // Last month's revenue
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];
      const lastMonthEnd = new Date(currentMonth);
      lastMonthEnd.setDate(0);
      const lastMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= lastMonthStr && p.payment_month < currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // Generate revenue chart data (last 6 months)
      const monthlyRevenue: { [key: string]: number } = {};
      const monthlyEnrollments: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        monthlyRevenue[monthKey] = 0;
        monthlyEnrollments[monthKey] = 0;
      }

      (allPayments || []).forEach(p => {
        if (p.payment_month) {
          const monthKey = p.payment_month.slice(0, 7);
          if (monthlyRevenue.hasOwnProperty(monthKey)) {
            monthlyRevenue[monthKey] += Number(p.final_amount || 0);
            monthlyEnrollments[monthKey] += 1;
          }
        }
      });

      const chartData = Object.entries(monthlyRevenue).map(([key, value]) => {
        const date = new Date(key + '-01');
        return {
          name: date.toLocaleDateString('en-US', { month: 'short' }),
          value,
        };
      });

      const enrollmentChartData = Object.entries(monthlyEnrollments).map(([key, value]) => {
        const date = new Date(key + '-01');
        return {
          name: date.toLocaleDateString('en-US', { month: 'short' }),
          value,
        };
      });

      setRevenueData(chartData);
      setEnrollmentData(enrollmentChartData);

      // Fetch top creators
      const { data: creatorsData } = await supabase
        .from('creator_profiles')
        .select('id, display_name, referral_code, lifetime_paid_users')
        .order('lifetime_paid_users', { ascending: false })
        .limit(5);

      if (creatorsData && creatorsData.length > 0) {
        const creatorsWithRevenue = await Promise.all(
          creatorsData.map(async (creator) => {
            const { data: creatorPayments } = await supabase
              .from('payment_attributions')
              .select('final_amount')
              .eq('creator_id', creator.id);
            
            const revenue = (creatorPayments || []).reduce(
              (sum, p) => sum + Number(p.final_amount || 0), 0
            );
            
            return { ...creator, revenue };
          })
        );
        setTopCreators(creatorsWithRevenue);
      }

      setStats({
        totalStudents,
        totalCreators: totalCreators || 0,
        activeEnrollments: activeEnrollments || 0,
        totalCodes: totalCodes || 0,
        activeCodes: activeCodes || 0,
        totalSubjects: totalSubjects || 0,
        pendingUpgrades: pendingUpgrades || 0,
        pendingJoinRequests: pendingJoinRequests || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingHeadOpsRequests: pendingHeadOpsRequests || 0,
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        starterCount,
        standardCount,
        lifetimeCount,
        cardPayments,
        bankPayments,
        currentPhase: businessPhase?.current_phase || 1,
        phaseName: businessPhase?.phase_name || 'Phase 1',
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        toast.error('Not authenticated');
        setIsClearing(false);
        return;
      }

      const response = await supabase.functions.invoke('admin-purge-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Purge failed');
      }

      toast.success('All user data, stats, and creator accounts cleared. Admin & CMO accounts preserved.');
      fetchStats();
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data: ' + error.message);
    }
    setIsClearing(false);
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('admin-payments-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payment_attributions' },
        () => {
          console.log('Payment attribution change detected, refreshing stats...');
          fetchStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          console.log('Payment change detected, refreshing stats...');
          fetchStats();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const revenueTrend = stats.lastMonthRevenue > 0 
    ? Math.round(((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100) 
    : 0;

  const tierDistributionData = [
    { name: 'Starter', value: stats.starterCount },
    { name: 'Standard', value: stats.standardCount },
    { name: 'Lifetime', value: stats.lifetimeCount },
  ];

  const paymentMethodData = [
    { name: 'Card', value: stats.cardPayments },
    { name: 'Bank', value: stats.bankPayments },
  ];

  const statCards = [
    { 
      label: 'Total Revenue', 
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign,
      iconColor: 'amber' as const,
      trend: revenueTrend !== 0 ? { value: Math.abs(revenueTrend), isPositive: revenueTrend > 0 } : undefined,
    },
    { 
      label: 'This Month', 
      value: `Rs. ${stats.thisMonthRevenue.toLocaleString()}`, 
      icon: TrendingUp,
      iconColor: 'green' as const,
      subtitle: stats.lastMonthRevenue > 0 ? `Last: Rs. ${stats.lastMonthRevenue.toLocaleString()}` : undefined,
    },
    { 
      label: 'Total Creators', 
      value: stats.totalCreators, 
      icon: Users,
      iconColor: 'purple' as const,
    },
    { 
      label: 'Total Students', 
      value: stats.totalStudents, 
      icon: Users,
      iconColor: 'blue' as const,
    },
  ];

  const menuItems = [
    { label: 'Join Requests', href: '/admin/join-requests', icon: Users, description: 'Review bank transfer signups', badge: stats.pendingJoinRequests },
    { label: 'Head of Ops Requests', href: '/admin/headops-requests', icon: FileCheck, description: 'Review operational requests from Head of Ops', badge: stats.pendingHeadOpsRequests },
    { label: 'View Payments', href: '/admin/payments', icon: DollarSign, description: 'All card & bank payments', badge: 0 },
    { label: 'Payment Settings', href: '/admin/payment-settings', icon: Settings, description: 'Test/Live mode & PayHere config', badge: 0 },
    { label: 'Payment Reconciliation', href: '/admin/reconciliation', icon: GitCompare, description: 'Fix missing payment attributions', badge: 0 },
    { label: 'Withdrawal Requests', href: '/admin/withdrawals', icon: Wallet, description: 'Manage creator payouts', badge: stats.pendingWithdrawals },
    { label: 'Referral Analytics', href: '/admin/analytics', icon: BarChart3, description: 'CMOs, creators, payouts & commissions', badge: 0 },
    { label: 'Generate Access Codes', href: '/admin/codes', icon: Key, description: 'Create and manage access codes', badge: 0 },
    { label: 'Manage Enrollments', href: '/admin/enrollments', icon: Users, description: 'View and manage student enrollments', badge: 0 },
    { label: 'Content Management', href: '/admin/content', icon: BookOpen, description: 'Upload and organize learning materials', badge: 0 },
    { label: 'Upgrade Requests', href: '/admin/upgrades', icon: Crown, description: 'Review tier upgrade requests', badge: stats.pendingUpgrades },
    { label: 'Pricing Settings', href: '/admin/pricing', icon: DollarSign, description: 'Manage package pricing on homepage', badge: 0 },
    { label: 'Branding Settings', href: '/admin/branding', icon: Palette, description: 'Site name, logo, heading & pricing buttons', badge: 0 },
    { label: 'Security & Abuse', href: '/admin/security', icon: Shield, description: 'Monitor suspicious activity', badge: 0 },
  ];

  const pendingTotal = stats.pendingJoinRequests + stats.pendingUpgrades + stats.pendingWithdrawals + stats.pendingHeadOpsRequests;

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                Admin Panel
              </Link>
              <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Last Updated Timestamp */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">
            {lastUpdated ? `Last updated: ${format(lastUpdated, 'PPp')}` : 'Loading...'}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchStats()} 
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Pending Actions Alert */}
        {pendingTotal > 0 && (
          <div className="glass-card p-4 mb-6 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{pendingTotal} Pending Actions</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingJoinRequests > 0 && `${stats.pendingJoinRequests} join requests`}
                    {stats.pendingJoinRequests > 0 && (stats.pendingUpgrades > 0 || stats.pendingWithdrawals > 0 || stats.pendingHeadOpsRequests > 0) && ', '}
                    {stats.pendingUpgrades > 0 && `${stats.pendingUpgrades} upgrades`}
                    {stats.pendingUpgrades > 0 && (stats.pendingWithdrawals > 0 || stats.pendingHeadOpsRequests > 0) && ', '}
                    {stats.pendingWithdrawals > 0 && `${stats.pendingWithdrawals} withdrawals`}
                    {stats.pendingWithdrawals > 0 && stats.pendingHeadOpsRequests > 0 && ', '}
                    {stats.pendingHeadOpsRequests > 0 && `${stats.pendingHeadOpsRequests} ops requests`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {stats.pendingJoinRequests > 0 && (
                  <Link to="/admin/join-requests">
                    <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                      Join Requests
                    </Button>
                  </Link>
                )}
                {stats.pendingHeadOpsRequests > 0 && (
                  <Link to="/admin/headops-requests">
                    <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                      Ops Requests
                    </Button>
                  </Link>
                )}
                {stats.pendingUpgrades > 0 && (
                  <Link to="/admin/upgrades">
                    <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                      Upgrades
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Business Phase Panel */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Business Phase</h3>
                <p className="text-muted-foreground text-sm">Current: {stats.phaseName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-brand">Phase {stats.currentPhase}</p>
                <p className="text-xs text-muted-foreground">{stats.totalCreators} creators active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={isLoading ? '...' : stat.value}
              icon={stat.icon}
              iconColor={stat.iconColor}
              trend={stat.trend}
              subtitle={stat.subtitle}
            />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">Revenue (Last 6 Months)</h3>
            <MiniChart 
              data={revenueData} 
              type="area" 
              height={180} 
              showAxis 
              showGrid 
            />
          </div>

          {/* Tier Distribution */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">User Tiers</h3>
            <div className="flex items-center justify-center">
              <MiniChart 
                data={tierDistributionData} 
                type="donut" 
                height={140}
                colors={['hsl(var(--brand))', 'hsl(199, 89%, 48%)', 'hsl(142, 76%, 36%)']}
              />
            </div>
            <ChartLegend 
              items={[
                { name: 'Starter', color: 'hsl(var(--brand))', value: stats.starterCount },
                { name: 'Standard', color: 'hsl(199, 89%, 48%)', value: stats.standardCount },
                { name: 'Lifetime', color: 'hsl(142, 76%, 36%)', value: stats.lifetimeCount },
              ]}
              className="mt-4 justify-center"
            />
          </div>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Payment Methods */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Payment Methods</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Card Payments</p>
                    <p className="text-xs text-muted-foreground">Online gateway</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">Rs. {stats.cardPayments.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Bank Transfers</p>
                    <p className="text-xs text-muted-foreground">Manual verification</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">Rs. {stats.bankPayments.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Enrollments Trend */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">New Enrollments</h3>
            <MiniChart 
              data={enrollmentData} 
              type="bar" 
              height={140}
              showAxis
            />
          </div>

          {/* Top Creators */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Top Creators</h3>
            {topCreators.length > 0 ? (
              <div className="space-y-3">
                {topCreators.slice(0, 5).map((creator, index) => (
                  <div key={creator.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500/20 text-amber-500' :
                        index === 1 ? 'bg-gray-300/20 text-gray-400' :
                        index === 2 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                          {creator.display_name || creator.referral_code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {creator.lifetime_paid_users} users
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Rs. {creator.revenue.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No creators yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="glass-card p-5 hover:border-muted-foreground/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-foreground/80" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-500 rounded-full text-background text-xs flex items-center justify-center font-bold px-1">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-amber-400 transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Danger Zone</h3>
          </div>
          <p className="text-muted-foreground text-sm mb-2">
            Permanently delete all user accounts, enrollments, payments, referral data, creator accounts, and activity logs.
          </p>
          <p className="text-destructive text-xs font-medium mb-4">
            Warning: This resets the entire platform. Only admin and CMO accounts will be preserved.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isClearing}>
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Purge All User Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-destructive/30">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">Confirm Complete Data Purge</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p className="text-sm">This action is irreversible. The following will be permanently deleted:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>All student profiles & accounts</li>
                      <li>All creator accounts & their stats</li>
                      <li>All access codes</li>
                      <li>All enrollments</li>
                      <li>All payments (card & bank)</li>
                      <li>All join requests</li>
                      <li>All referral attributions & commissions</li>
                      <li>All withdrawal requests & methods</li>
                      <li>All discount codes</li>
                      <li>All upgrade requests</li>
                      <li>All user sessions & download logs</li>
                    </ul>
                    <p className="text-xs text-foreground/70 font-medium border-t pt-3 mt-3">
                      Admin and CMO accounts will be preserved.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90">
                  Purge All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
