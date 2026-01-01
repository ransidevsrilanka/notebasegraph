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
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { MiniChart } from '@/components/dashboard/MiniChart';

interface Stats {
  totalStudents: number;
  activeEnrollments: number;
  totalCodes: number;
  activeCodes: number;
  totalSubjects: number;
  pendingUpgrades: number;
  pendingJoinRequests: number;
  pendingWithdrawals: number;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeEnrollments: 0,
    totalCodes: 0,
    activeCodes: 0,
    totalSubjects: 0,
    pendingUpgrades: 0,
    pendingJoinRequests: 0,
    pendingWithdrawals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{ name: string; value: number }[]>([]);

  const fetchStats = async () => {
    try {
      const [
        { count: totalStudents },
        { count: activeEnrollments },
        { count: totalCodes },
        { count: activeCodes },
        { count: totalSubjects },
        { count: pendingUpgrades },
        { count: pendingJoinRequests },
        { count: pendingWithdrawals },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalStudents: totalStudents || 0,
        activeEnrollments: activeEnrollments || 0,
        totalCodes: totalCodes || 0,
        activeCodes: activeCodes || 0,
        totalSubjects: totalSubjects || 0,
        pendingUpgrades: pendingUpgrades || 0,
        pendingJoinRequests: pendingJoinRequests || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
      });

      // Generate sample chart data (would be real data in production)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setEnrollmentData(months.map((name, i) => ({
        name,
        value: Math.floor((totalStudents || 0) * (0.5 + (i * 0.1)) / 6)
      })));

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setIsLoading(false);
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const { error: downloadError } = await supabase
        .from('download_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (downloadError) throw downloadError;

      const { error: upgradeError } = await supabase
        .from('upgrade_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (upgradeError) throw upgradeError;

      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (enrollmentError) throw enrollmentError;

      const { error: codesError } = await supabase
        .from('access_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (codesError) throw codesError;

      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (sessionsError) throw sessionsError;

      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('role', 'student');
      if (rolesError) throw rolesError;

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'content_admin', 'support_admin']);
      
      const adminUserIds = adminRoles?.map(r => r.user_id) || [];

      if (adminUserIds.length > 0) {
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .not('id', 'in', `(${adminUserIds.join(',')})`);
        if (profilesError) throw profilesError;
      } else {
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (profilesError) throw profilesError;
      }

      toast.success('All user data cleared. Non-admin accounts can no longer sign in.');
      fetchStats();
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data: ' + error.message);
    }
    setIsClearing(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users },
    { label: 'Active Enrollments', value: stats.activeEnrollments, icon: TrendingUp },
    { label: 'Access Codes', value: `${stats.activeCodes}/${stats.totalCodes}`, icon: Key },
    { label: 'Subjects', value: stats.totalSubjects, icon: BookOpen },
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
    <main className="min-h-screen bg-background">
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

        {/* Chart Section */}
        <div className="glass-card p-6 mb-8">
          <h3 className="font-semibold text-foreground mb-4">Enrollment Trend</h3>
          <MiniChart 
            data={enrollmentData} 
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
            Permanently delete all user accounts, enrollments, access codes, sessions, and activity logs.
          </p>
          <p className="text-destructive text-xs font-medium mb-4">
            Warning: All non-admin users will be unable to sign in after this action.
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
                <AlertDialogTitle className="text-destructive">Confirm Data Purge</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p className="text-sm">This action is irreversible. The following will be permanently deleted:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>All student profiles</li>
                      <li>All access codes</li>
                      <li>All enrollments</li>
                      <li>All upgrade requests</li>
                      <li>All user sessions</li>
                      <li>All download logs</li>
                    </ul>
                    <p className="text-xs text-foreground/70 font-medium border-t pt-3 mt-3">
                      Admin accounts will be preserved.
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
