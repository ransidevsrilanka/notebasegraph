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
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { MiniChart } from '@/components/dashboard/MiniChart';
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
  totalRevenue: number;
  thisMonthRevenue: number;
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
    totalRevenue: 0,
    thisMonthRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [revenueData, setRevenueData] = useState<{ name: string; value: number }[]>([]);
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
        { count: totalCreators },
      ] = await Promise.all([
        supabase.from('enrollments').select('user_id').eq('is_active', true),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }),
      ]);

      // Count students = active enrollments excluding non-student roles
      const totalStudents = (allEnrollments || []).filter(
        e => !nonStudentUserIds.has(e.user_id)
      ).length;

      // Fetch revenue data from payment_attributions
      const { data: allPayments } = await supabase
        .from('payment_attributions')
        .select('final_amount, payment_month');

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // This month's revenue
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const currentMonthStr = currentMonth.toISOString().split('T')[0];
      const thisMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      // Generate revenue chart data (last 6 months)
      const monthlyRevenue: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        monthlyRevenue[monthKey] = 0;
      }

      (allPayments || []).forEach(p => {
        if (p.payment_month) {
          const monthKey = p.payment_month.slice(0, 7);
          if (monthlyRevenue.hasOwnProperty(monthKey)) {
            monthlyRevenue[monthKey] += Number(p.final_amount || 0);
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

      setRevenueData(chartData);

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
        totalRevenue,
        thisMonthRevenue,
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
      // Get admin and CMO user IDs to preserve
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'content_admin', 'support_admin', 'admin', 'cmo']);
      
      const preservedUserIds = adminRoles?.map(r => r.user_id) || [];

      // 1. Delete payment attributions (referral income tracking)
      const { error: paymentAttrError } = await supabase
        .from('payment_attributions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (paymentAttrError) throw paymentAttrError;

      // 2. Delete user attributions (referral links)
      const { error: userAttrError } = await supabase
        .from('user_attributions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (userAttrError) throw userAttrError;

      // 3. Delete payments
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (paymentsError) throw paymentsError;

      // 4. Delete join requests (bank transfers)
      const { error: joinReqError } = await supabase
        .from('join_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (joinReqError) throw joinReqError;

      // 5. Delete withdrawal requests
      const { error: withdrawalReqError } = await supabase
        .from('withdrawal_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (withdrawalReqError) throw withdrawalReqError;

      // 6. Delete withdrawal methods
      const { error: withdrawalMethodsError } = await supabase
        .from('withdrawal_methods')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (withdrawalMethodsError) throw withdrawalMethodsError;

      // 7. Delete creator payouts
      const { error: creatorPayoutsError } = await supabase
        .from('creator_payouts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (creatorPayoutsError) throw creatorPayoutsError;

      // 7b. Delete CMO payouts
      const { error: cmoPayoutsError } = await supabase
        .from('cmo_payouts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (cmoPayoutsError) throw cmoPayoutsError;

      // 8. Delete discount codes
      const { error: discountCodesError } = await supabase
        .from('discount_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (discountCodesError) throw discountCodesError;

      // 9. Delete creator profiles (this deletes all creators)
      const { error: creatorProfilesError } = await supabase
        .from('creator_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (creatorProfilesError) throw creatorProfilesError;

      // 10. Delete user subjects
      const { error: userSubjectsError } = await supabase
        .from('user_subjects')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (userSubjectsError) throw userSubjectsError;

      // 11. Delete download logs
      const { error: downloadError } = await supabase
        .from('download_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (downloadError) throw downloadError;

      // 12. Delete upgrade requests
      const { error: upgradeError } = await supabase
        .from('upgrade_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (upgradeError) throw upgradeError;

      // 13. Delete enrollments
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (enrollmentError) throw enrollmentError;

      // 14. Delete access codes
      const { error: codesError } = await supabase
        .from('access_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (codesError) throw codesError;

      // 15. Delete user sessions
      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (sessionsError) throw sessionsError;

      // 16. Delete student and creator roles (preserve admin/cmo roles)
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .in('role', ['student', 'creator', 'user']);
      if (rolesError) throw rolesError;

      // 17. Delete non-admin/cmo profiles
      if (preservedUserIds.length > 0) {
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .not('user_id', 'in', `(${preservedUserIds.join(',')})`);
        if (profilesError) throw profilesError;
      } else {
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (profilesError) throw profilesError;
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

    // Subscribe to real-time payment updates
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

  const statCards = [
    { label: 'Total Revenue', value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
    { label: 'This Month', value: `Rs. ${stats.thisMonthRevenue.toLocaleString()}`, icon: TrendingUp },
    { label: 'Total Creators', value: stats.totalCreators, icon: Users },
    { label: 'Total Students', value: stats.totalStudents, icon: Users },
    { label: 'Active Enrollments', value: stats.activeEnrollments, icon: TrendingUp },
  ];

  const menuItems = [
    { label: 'Join Requests', href: '/admin/join-requests', icon: Users, description: 'Review bank transfer signups', badge: stats.pendingJoinRequests },
    { label: 'View Payments', href: '/admin/payments', icon: DollarSign, description: 'All card & bank payments', badge: 0 },
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={isLoading ? '...' : stat.value}
              icon={stat.icon}
            />
          ))}
        </div>

        {/* Revenue Chart Section */}
        <div className="glass-card p-6 mb-8">
          <h3 className="font-semibold text-foreground mb-4">Revenue (Last 6 Months)</h3>
          <MiniChart 
            data={revenueData} 
            type="area" 
            height={180} 
            showAxis 
            showGrid 
          />
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

        {/* Alerts Section */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-foreground">Recent Alerts</h3>
          </div>
          <div className="text-muted-foreground text-sm">
            No alerts at this time. The system is running smoothly.
          </div>
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
