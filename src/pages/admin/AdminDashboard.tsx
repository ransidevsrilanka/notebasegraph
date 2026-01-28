import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  TrendingUp,
  LogOut,
  Crown,
  DollarSign,
  Trash2,
  RefreshCw,
  HardDrive,
  Database,
  Share2,
  Printer,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/dashboard/StatCard';
import MiniStatCard from '@/components/dashboard/MiniStatCard';
import { MiniChart } from '@/components/dashboard/MiniChart';
import { ChartLegend } from '@/components/dashboard/ChartLegend';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { CreatorLeaderboard } from '@/components/dashboard/CreatorLeaderboard';
import { RevenueForecast } from '@/components/dashboard/RevenueForecast';
import { ReferralNetworkBreakdown } from '@/components/dashboard/ReferralNetworkBreakdown';
import { format } from 'date-fns';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';

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
  pendingPrintRequests: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  // Weekly revenue for forecast
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  twoWeeksAgoRevenue: number;
  starterCount: number;
  standardCount: number;
  lifetimeCount: number;
  cardPayments: number;
  bankPayments: number;
  accessCodeRevenue: number;
  currentPhase: number;
  phaseName: string;
  // Student referral stats
  totalUserReferrals: number;
  paidUserReferrals: number;
  userRewardsUnlocked: number;
  // Creator referral stats
  creatorSignups: number;
  creatorConversions: number;
  creatorRevenue: number;
  // CMO stats
  totalCMOs: number;
  cmoCreators: number;
  cmoNetworkRevenue: number;
  // Print request stats
  printRevenue: number;
  printCost: number;
  printProfit: number;
  totalPrintPages: number;
  // Creator commissions
  creatorCommissions: number;
}

interface TopCreator {
  id: string;
  display_name: string;
  referral_code: string;
  lifetime_paid_users: number;
  monthly_paid_users?: number;
  revenue: number;
}

interface FunnelStats {
  totalSignups: number;
  totalPaidUsers: number;
}

interface MonthlyRevenue {
  twoMonthsAgo: number;
}

// Storage Usage Component
const StorageUsageCard = () => {
  const [storageUsed, setStorageUsed] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStorageStats = async () => {
      try {
        const { data: notesFiles, error: notesError } = await supabase.storage
          .from('notes')
          .list('', { limit: 1000 });

        const { data: contentFiles, error: contentError } = await supabase.storage
          .from('content')
          .list('', { limit: 1000 });

        let totalSize = 0;
        let totalFiles = 0;

        if (notesFiles && !notesError) {
          totalFiles += notesFiles.length;
          totalSize += notesFiles.length * 5;
        }

        if (contentFiles && !contentError) {
          totalFiles += contentFiles.length;
          totalSize += contentFiles.length * 5;
        }

        setStorageUsed(totalSize);
        setFileCount(totalFiles);
      } catch (error) {
        console.error('Error fetching storage stats:', error);
      }
      setIsLoading(false);
    };

    fetchStorageStats();
  }, []);

  const estimatedQuota = 1024;
  const usagePercent = Math.min((storageUsed / estimatedQuota) * 100, 100);

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-purple-400" />
        Storage Usage (Estimated)
      </h3>
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground">{storageUsed} MB</p>
              <p className="text-xs text-muted-foreground">of ~{estimatedQuota} MB estimated</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-foreground">{fileCount}</p>
              <p className="text-xs text-muted-foreground">files stored</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={usagePercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usagePercent.toFixed(1)}% used</span>
              <span>{estimatedQuota - storageUsed} MB remaining</span>
            </div>
          </div>

          {usagePercent > 80 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
              <p className="text-xs text-amber-400">
                ⚠️ Storage is running low. Consider upgrading or using external storage like Cloudflare R2.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            💡 For large files (50MB+), consider <strong>Cloudflare R2</strong> for cost-effective storage.
          </p>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };
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
    pendingPrintRequests: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    thisWeekRevenue: 0,
    lastWeekRevenue: 0,
    twoWeeksAgoRevenue: 0,
    starterCount: 0,
    standardCount: 0,
    lifetimeCount: 0,
    cardPayments: 0,
    bankPayments: 0,
    accessCodeRevenue: 0,
    currentPhase: 1,
    phaseName: 'Phase 1',
    totalUserReferrals: 0,
    paidUserReferrals: 0,
    userRewardsUnlocked: 0,
    // Creator referral stats
    creatorSignups: 0,
    creatorConversions: 0,
    creatorRevenue: 0,
    // CMO stats
    totalCMOs: 0,
    cmoCreators: 0,
    cmoNetworkRevenue: 0,
    // Print stats
    printRevenue: 0,
    printCost: 0,
    printProfit: 0,
    totalPrintPages: 0,
    // Creator commissions
    creatorCommissions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [revenueData, setRevenueData] = useState<{ name: string; value: number }[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{ name: string; value: number }[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({ totalSignups: 0, totalPaidUsers: 0 });

  const fetchStats = async () => {
    try {
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
        { count: pendingPrintRequests },
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
        supabase.from('print_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('tier').eq('is_active', true),
        supabase.from('business_phases').select('*').limit(1).maybeSingle(),
      ]);

      const totalStudents = (allEnrollments || []).filter(
        e => !nonStudentUserIds.has(e.user_id)
      ).length;

      const starterCount = (enrollmentTiers || []).filter(e => e.tier === 'starter').length;
      const standardCount = (enrollmentTiers || []).filter(e => e.tier === 'standard').length;
      const lifetimeCount = (enrollmentTiers || []).filter(e => e.tier === 'lifetime').length;

      const { data: allPayments } = await supabase
        .from('payment_attributions')
        .select('final_amount, payment_month, payment_type, creator_commission_amount');

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      const cardPayments = (allPayments || [])
        .filter(p => p.payment_type === 'card')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      const bankPayments = (allPayments || [])
        .filter(p => p.payment_type === 'bank')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      const accessCodeRevenue = (allPayments || [])
        .filter(p => p.payment_type === 'access_code')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      
      // Total creator commissions
      const creatorCommissions = (allPayments || []).reduce(
        (sum, p) => sum + Number(p.creator_commission_amount || 0), 0
      );

      const currentMonth = new Date();
      currentMonth.setDate(1);
      const currentMonthStr = currentMonth.toISOString().split('T')[0];
      const thisMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];
      const lastMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= lastMonthStr && p.payment_month < currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

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

      // Fetch funnel stats - total signups from user_attributions and enrollments
      const { count: totalSignups } = await supabase
        .from('user_attributions')
        .select('*', { count: 'exact', head: true });

      setFunnelStats({
        totalSignups: totalSignups || 0,
        totalPaidUsers: activeEnrollments || 0,
      });

      // Fetch student-to-student referral stats
      // User referrals are stored with referral_source starting with 'USR'
      const { count: totalUserReferrals } = await supabase
        .from('user_attributions')
        .select('*', { count: 'exact', head: true })
        .like('referral_source', 'USR%');

      // Count how many user referrals converted to paid
      const { data: userRefAttributions } = await supabase
        .from('user_attributions')
        .select('user_id')
        .like('referral_source', 'USR%');

      let paidUserReferrals = 0;
      if (userRefAttributions && userRefAttributions.length > 0) {
        const userIds = userRefAttributions.map(a => a.user_id);
        const { count } = await supabase
          .from('payment_attributions')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds);
        paidUserReferrals = count || 0;
      }

      // Count claimed referral rewards
      const { count: userRewardsUnlocked } = await supabase
        .from('referral_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('is_claimed', true);

      // Creator referral stats - signups through creator codes
      const { count: creatorSignups } = await supabase
        .from('user_attributions')
        .select('*', { count: 'exact', head: true })
        .not('discount_code_id', 'is', null);

      // Creator conversions and revenue - payments attributed to creators
      const { data: creatorPaymentsAll } = await supabase
        .from('payment_attributions')
        .select('final_amount, creator_id')
        .not('creator_id', 'is', null);

      const creatorConversions = creatorPaymentsAll?.length || 0;
      const creatorRevenue = (creatorPaymentsAll || []).reduce(
        (sum, p) => sum + Number(p.final_amount || 0), 0
      );

      // CMO stats
      const { count: totalCMOs } = await supabase
        .from('cmo_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: cmoCreators } = await supabase
        .from('creator_profiles')
        .select('*', { count: 'exact', head: true })
        .not('cmo_id', 'is', null);

      // CMO network revenue - revenue from creators under CMOs
      const { data: cmoCreatorIds } = await supabase
        .from('creator_profiles')
        .select('id')
        .not('cmo_id', 'is', null);

      let cmoNetworkRevenue = 0;
      if (cmoCreatorIds && cmoCreatorIds.length > 0) {
        const creatorIdList = cmoCreatorIds.map(c => c.id);
        const { data: cmoPayments } = await supabase
          .from('payment_attributions')
          .select('final_amount')
          .in('creator_id', creatorIdList);
        cmoNetworkRevenue = (cmoPayments || []).reduce(
          (sum, p) => sum + Number(p.final_amount || 0), 0
        );
      }

      // Fetch print settings for cost calculation
      const { data: printSettings } = await supabase
        .from('print_settings')
        .select('print_cost_per_page')
        .eq('is_active', true)
        .single();

      const printCostPerPage = printSettings?.print_cost_per_page || 4;

      // Print request revenue and pages calculation
      const { data: printPayments } = await supabase
        .from('print_requests')
        .select('total_amount, estimated_pages')
        .eq('payment_status', 'paid');
      
      const printRevenue = (printPayments || []).reduce(
        (sum, p) => sum + Number(p.total_amount || 0), 0
      );
      const totalPrintPages = (printPayments || []).reduce(
        (sum, p) => sum + (p.estimated_pages || 0), 0
      );
      const printCost = totalPrintPages * printCostPerPage;
      const printProfit = printRevenue - printCost;

      // Weekly revenue calculations
      const now = new Date();
      const dayOfWeek = now.getDay() || 7; // Sunday = 0, convert to 7
      
      // Start of this week (Monday)
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
      thisWeekStart.setHours(0, 0, 0, 0);
      
      // Start of last week
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      // Start of two weeks ago
      const twoWeeksAgoStart = new Date(lastWeekStart);
      twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 7);
      
      const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
      const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
      const twoWeeksAgoStartStr = twoWeeksAgoStart.toISOString().split('T')[0];
      
      // Calculate this week's revenue
      const thisWeekRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= thisWeekStartStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      
      // Calculate last week's revenue
      const lastWeekRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= lastWeekStartStr && p.payment_month < thisWeekStartStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      
      // Calculate two weeks ago revenue
      const twoWeeksAgoRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= twoWeeksAgoStartStr && p.payment_month < lastWeekStartStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      
      // Days into current week (Monday = 1, Tuesday = 2, etc.)
      const daysIntoWeek = dayOfWeek;

      const { data: creatorsData } = await supabase
        .from('creator_profiles')
        .select('id, display_name, referral_code, lifetime_paid_users, monthly_paid_users')
        .order('lifetime_paid_users', { ascending: false })
        .limit(10);

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
            
            return { 
              ...creator, 
              revenue,
              monthly_paid_users: creator.monthly_paid_users || 0 
            };
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
        pendingPrintRequests: pendingPrintRequests || 0,
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        thisWeekRevenue,
        lastWeekRevenue,
        twoWeeksAgoRevenue,
        starterCount,
        standardCount,
        lifetimeCount,
        cardPayments,
        bankPayments,
        accessCodeRevenue,
        currentPhase: businessPhase?.current_phase || 1,
        phaseName: businessPhase?.phase_name || 'Phase 1',
        totalUserReferrals: totalUserReferrals || 0,
        paidUserReferrals,
        userRewardsUnlocked: userRewardsUnlocked || 0,
        creatorSignups: creatorSignups || 0,
        creatorConversions,
        creatorRevenue,
        totalCMOs: totalCMOs || 0,
        cmoCreators: cmoCreators || 0,
        cmoNetworkRevenue,
        printRevenue,
        printCost,
        printProfit,
        totalPrintPages,
        creatorCommissions,
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
    { 
      label: 'Student Referrals', 
      value: stats.totalUserReferrals, 
      icon: Share2,
      iconColor: 'green' as const,
      subtitle: `${stats.paidUserReferrals} converted, ${stats.userRewardsUnlocked} rewards claimed`,
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar stats={stats} />
        <AdminCommandPalette />
        
        <SidebarInset className="flex-1 admin-premium-bg">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-foreground">CEO Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {format(lastUpdated, 'h:mm a')}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6 space-y-6">
            {/* Net Profit Card - Primary Metric */}
            {(() => {
              const totalRevenue = stats.totalRevenue + stats.printRevenue;
              const payhereCommission = stats.cardPayments * 0.033; // 3.3% PayHere fee
              const profit = totalRevenue - payhereCommission - stats.creatorCommissions;
              
              return (
                <div className="glass-card-premium p-6 bg-gradient-to-r from-green-500/10 via-brand/5 to-transparent border-green-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-muted-foreground font-medium">Net Profit</span>
                      </div>
                      <p className="text-3xl sm:text-4xl font-bold text-green-500">
                        Rs. {profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Revenue: Rs. {totalRevenue.toLocaleString()} − PayHere ({(payhereCommission / 1000).toFixed(1)}K) − Commissions ({(stats.creatorCommissions / 1000).toFixed(1)}K)
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-lg font-semibold text-foreground">Rs. {(totalRevenue / 1000).toFixed(1)}K</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">PayHere Fee</p>
                        <p className="text-lg font-semibold text-orange-500">-Rs. {(payhereCommission / 1000).toFixed(1)}K</p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Commissions</p>
                        <p className="text-lg font-semibold text-purple-500">-Rs. {(stats.creatorCommissions / 1000).toFixed(1)}K</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 6 Essential Metrics Grid (3x2) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStatCard label="Total Revenue" value={stats.totalRevenue + stats.printRevenue} format="currency" trend={revenueTrend !== 0 ? { value: Math.abs(revenueTrend), isPositive: revenueTrend > 0 } : undefined} />
              <MiniStatCard label="This Month" value={stats.thisMonthRevenue} format="currency" />
              <MiniStatCard label="Active Students" value={stats.totalStudents} />
              <MiniStatCard label="Card Payments" value={stats.cardPayments} format="currency" />
              <MiniStatCard label="Bank Payments" value={stats.bankPayments} format="currency" />
              <MiniStatCard label="Print Revenue" value={stats.printRevenue} format="currency" />
            </div>

            {/* Conversion Funnel & Revenue Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConversionFunnel 
                totalSignups={funnelStats.totalSignups}
                totalPaidUsers={funnelStats.totalPaidUsers}
                totalRevenue={stats.totalRevenue}
              />
              <RevenueForecast 
                thisWeekRevenue={stats.thisWeekRevenue}
                lastWeekRevenue={stats.lastWeekRevenue}
                twoWeeksAgoRevenue={stats.twoWeeksAgoRevenue}
                daysIntoWeek={new Date().getDay() || 7}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="glass-card-premium p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  Revenue (Last 6 Months)
                </h3>
                <MiniChart data={revenueData} colors={['#f59e0b']} height={180} />
              </div>

              {/* Enrollments Chart */}
              <div className="glass-card-premium p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  New Enrollments (Last 6 Months)
                </h3>
                <MiniChart data={enrollmentData} colors={['#3b82f6']} height={180} />
              </div>
            </div>

            {/* Tier & Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tier Distribution */}
              <div className="glass-card-premium p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-gold" />
                  Tier Distribution
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <ProgressRing
                    progress={stats.activeEnrollments > 0 ? (stats.lifetimeCount / stats.activeEnrollments) * 100 : 0}
                    size={120}
                    strokeWidth={12}
                    color="hsl(var(--gold))"
                    label="Lifetime"
                  />
                </div>
                <ChartLegend
                  items={[
                    { name: 'Starter', value: stats.starterCount, color: 'bg-muted-foreground' },
                    { name: 'Standard', value: stats.standardCount, color: 'bg-brand' },
                    { name: 'Lifetime', value: stats.lifetimeCount, color: 'bg-gold' },
                  ]}
                />
              </div>

              {/* Payment Methods */}
              <div className="glass-card-premium p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-400" />
                  Payment Methods
                </h3>
                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Card Payments</span>
                    <span className="font-medium text-foreground">Rs. {stats.cardPayments.toLocaleString()}</span>
                  </div>
                  <Progress value={stats.totalRevenue > 0 ? (stats.cardPayments / stats.totalRevenue) * 100 : 0} className="h-2" />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted-foreground">Bank Transfers</span>
                    <span className="font-medium text-foreground">Rs. {stats.bankPayments.toLocaleString()}</span>
                  </div>
                  <Progress value={stats.totalRevenue > 0 ? (stats.bankPayments / stats.totalRevenue) * 100 : 0} className="h-2" />
                </div>
              </div>

              {/* Storage Usage */}
              <StorageUsageCard />
            </div>

            {/* Referral Network Breakdown */}
            <ReferralNetworkBreakdown 
              stats={{
                userSignups: stats.totalUserReferrals,
                userConversions: stats.paidUserReferrals,
                userRewardsClaimed: stats.userRewardsUnlocked,
                creatorSignups: stats.creatorSignups,
                creatorConversions: stats.creatorConversions,
                creatorRevenue: stats.creatorRevenue,
                totalCMOs: stats.totalCMOs,
                cmoCreators: stats.cmoCreators,
                cmoNetworkRevenue: stats.cmoNetworkRevenue,
              }}
            />

            {/* Creator Leaderboard */}
            {topCreators.length > 0 && (
              <CreatorLeaderboard creators={topCreators} showMonthly={true} />
            )}

            {/* Danger Zone */}
            <div className="glass-card-premium p-6 border-destructive/30">
              <h3 className="font-semibold text-destructive mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clear all user data, payment records, and creator accounts. Admin and CMO accounts will be preserved.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isClearing}>
                    {isClearing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all user accounts, enrollments, payments, and creator data. Only admin and CMO accounts will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground">
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
