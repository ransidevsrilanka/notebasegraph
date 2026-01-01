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
  Clock,
  ChevronRight,
  LogOut,
  Crown,
  DollarSign,
  Palette,
  Trash2,
  BarChart3,
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  activeEnrollments: number;
  totalCodes: number;
  activeCodes: number;
  totalSubjects: number;
  pendingUpgrades: number;
  pendingJoinRequests: number;
}

const AdminDashboard = () => {
  const { user, roles, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeEnrollments: 0,
    totalCodes: 0,
    activeCodes: 0,
    totalSubjects: 0,
    pendingUpgrades: 0,
    pendingJoinRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

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
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalStudents: totalStudents || 0,
        activeEnrollments: activeEnrollments || 0,
        totalCodes: totalCodes || 0,
        activeCodes: activeCodes || 0,
        totalSubjects: totalSubjects || 0,
        pendingUpgrades: pendingUpgrades || 0,
        pendingJoinRequests: pendingJoinRequests || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setIsLoading(false);
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      // Delete in order to respect foreign key constraints
      // 1. Download logs (references notes)
      const { error: downloadError } = await supabase
        .from('download_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (downloadError) throw downloadError;

      // 2. Upgrade requests (references enrollments)
      const { error: upgradeError } = await supabase
        .from('upgrade_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (upgradeError) throw upgradeError;

      // 3. Enrollments (references access_codes)
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (enrollmentError) throw enrollmentError;

      // 4. Access codes
      const { error: codesError } = await supabase
        .from('access_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (codesError) throw codesError;

      // 5. User sessions
      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (sessionsError) throw sessionsError;

      // 6. Delete non-admin user roles (keep admin roles)
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('role', 'student');
      if (rolesError) throw rolesError;

      // 7. Get admin user IDs to preserve
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'content_admin', 'support_admin']);
      
      const adminUserIds = adminRoles?.map(r => r.user_id) || [];

      // 8. Delete non-admin profiles
      if (adminUserIds.length > 0) {
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .not('id', 'in', `(${adminUserIds.join(',')})`);
        if (profilesError) throw profilesError;
      } else {
        // No admins found, delete all profiles
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
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Active Enrollments', value: stats.activeEnrollments, icon: TrendingUp, color: 'from-green-500 to-green-600' },
    { label: 'Access Codes', value: `${stats.activeCodes}/${stats.totalCodes}`, icon: Key, color: 'from-gold to-gold-light' },
    { label: 'Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'from-purple-500 to-purple-600' },
  ];

  const menuItems = [
    { label: 'Join Requests', href: '/admin/join-requests', icon: Users, description: 'Review bank transfer signups', badge: stats.pendingJoinRequests },
    { label: 'View Payments', href: '/admin/payments', icon: DollarSign, description: 'All card & bank payments', badge: 0 },
    { label: 'Withdrawal Requests', href: '/admin/withdrawals', icon: DollarSign, description: 'Manage creator payouts', badge: 0 },
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
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                <span className="text-gold">READ</span> VAULT
              </Link>
              <span className="px-2 py-1 rounded bg-gold/10 text-gold text-xs font-medium">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="glass-card p-6 hover:border-gold/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-gold" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        {/* Alerts Section */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-gold" />
            <h3 className="font-semibold text-foreground">Recent Alerts</h3>
          </div>
          <div className="text-muted-foreground text-sm">
            No alerts at this time. The system is running smoothly.
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 border border-destructive/40 bg-destructive/5">
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
