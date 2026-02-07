import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Plus,
  Wallet,
  Building2,
  Bitcoin,
  ArrowUpRight,
  Target,
  Award,
  AlertCircle,
  Headphones,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { TrendIndicator } from '@/components/dashboard/TrendIndicator';
import { ChartLegend } from '@/components/dashboard/ChartLegend';
import { EarningsCalendar } from '@/components/dashboard/EarningsCalendar';
import { QRCodeModal } from '@/components/dashboard/QRCodeModal';
import InboxButton from '@/components/inbox/InboxButton';
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus';
import { Trash2 } from 'lucide-react';

interface CreatorAnalytics {
  id: string;
  user_id: string;
  display_name: string | null;
  referral_code: string;
  cmo_id: string | null;
  is_active: boolean | null;
  created_at: string;
  total_withdrawn: number | null;
  available_balance: number | null;
  cmo_name: string | null;
  lifetime_paid_users: number;
  commission_rate: number;
  monthly_paid_users: number;
  total_commission_earned: number;
  discount_code_count: number;
  total_referred_users: number;
  tier_protection_until: string | null;
  current_tier_level: number;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  paid_conversions: number;
  is_active: boolean;
}

interface WithdrawalMethod {
  id: string;
  method_type: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  branch_name: string | null;
  crypto_type: string | null;
  wallet_address: string | null;
  network: string | null;
  is_primary: boolean;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface MonthlyData {
  month: string;
  earnings: number;
  referrals: number;
  conversions: number;
}

interface CommissionTier {
  id: string;
  tier_level: number;
  tier_name: string;
  commission_rate: number;
  monthly_user_threshold: number;
}

const CRYPTO_TYPES = ['USDT', 'BTC', 'ETH', 'BNB'];
const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20'];

const CreatorDashboard = () => {
  const { user, profile, isCreator, signOut } = useAuth();
  const navigate = useNavigate();
  const [creatorData, setCreatorData] = useState<CreatorAnalytics | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [minimumPayout, setMinimumPayout] = useState(10000);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState<{ date: string; amount: number }[]>([]);
  const [cmoContactInfo, setCmoContactInfo] = useState<{ email?: string; whatsapp?: string; instagram?: string; userId?: string } | null>(null);
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [savedTelegramChatId, setSavedTelegramChatId] = useState<string | null>(null);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // Dialog states
  const [addMethodDialogOpen, setAddMethodDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [addDiscountCodeDialogOpen, setAddDiscountCodeDialogOpen] = useState(false);
  const [methodType, setMethodType] = useState<'bank' | 'crypto'>('bank');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank form
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [branchName, setBranchName] = useState('');

  // Crypto form
  const [cryptoType, setCryptoType] = useState('USDT');
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');

  // Discount code form - only need the code name now (fixed 10% discount)
  const [newDiscountCode, setNewDiscountCode] = useState('');

  const MAX_DISCOUNT_CODES = 5;

  useEffect(() => {
    if (!isCreator) {
      navigate('/');
      return;
    }
    checkOnboardingAndFetchData();
  }, [isCreator, navigate, user]);

  const checkOnboardingAndFetchData = async () => {
    if (!user) return;

    // Check if onboarding is completed
    const { data: onboardingData } = await supabase
      .from('creator_onboarding')
      .select('completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!onboardingData?.completed_at) {
      // Not completed, redirect to onboarding
      navigate('/creator/onboarding');
      return;
    }

    // Fetch commission tiers and platform settings
    const [tiersResult, settingsResult] = await Promise.all([
      supabase.from('commission_tiers').select('*').order('tier_level', { ascending: true }),
      supabase.from('platform_settings').select('setting_key, setting_value'),
    ]);

    if (tiersResult.data) {
      setCommissionTiers(tiersResult.data);
    }

    if (settingsResult.data) {
      const minPayoutSetting = settingsResult.data.find(s => s.setting_key === 'minimum_payout_lkr');
      if (minPayoutSetting?.setting_value) {
        const value = typeof minPayoutSetting.setting_value === 'number'
          ? minPayoutSetting.setting_value
          : Number(minPayoutSetting.setting_value);
        setMinimumPayout(value);
      }
    }

    fetchData();
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // First get creator profile to get ID
      const { data: creatorProfile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching creator profile:', profileError);
        throw profileError;
      }

      if (creatorProfile) {
        // Get CMO name and contact info if exists
        let cmoName: string | null = null;
        if (creatorProfile.cmo_id) {
          const { data: cmoData } = await supabase
            .from('cmo_profiles')
            .select('display_name, email, whatsapp, instagram, user_id')
            .eq('id', creatorProfile.cmo_id)
            .maybeSingle();
          cmoName = cmoData?.display_name || null;
          if (cmoData) {
            setCmoContactInfo({
              email: cmoData.email || undefined,
              whatsapp: cmoData.whatsapp || undefined,
              instagram: cmoData.instagram || undefined,
              userId: cmoData.user_id,
            });
          }
        }

        // Get monthly stats from payment_attributions
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const { count: monthlyPaidUsers } = await supabase
          .from('payment_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorProfile.id)
          .gte('created_at', currentMonth.toISOString());

        const { data: totalCommissionData } = await supabase
          .from('payment_attributions')
          .select('creator_commission_amount')
          .eq('creator_id', creatorProfile.id);

        const totalCommission = (totalCommissionData || []).reduce(
          (sum, p) => sum + Number(p.creator_commission_amount || 0), 0
        );

        const { count: totalReferred } = await supabase
          .from('user_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorProfile.id);

        const { count: discountCodeCount } = await supabase
          .from('discount_codes')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorProfile.id);

        // Calculate commission rate based on tier protection or monthly performance
        const monthlyCount = monthlyPaidUsers || 0;
        const isInProtectionPeriod = creatorProfile.tier_protection_until 
          ? new Date(creatorProfile.tier_protection_until) > new Date()
          : false;
        
        // Start with the creator's stored tier level (new creators start at level 2 = 12%)
        let effectiveTierLevel = creatorProfile.current_tier_level || 2;
        
        // Get the commission rate for the effective tier
        const getCurrentTierRate = (level: number) => {
          const tier = commissionTiers.find(t => t.tier_level === level);
          return tier?.commission_rate || 12; // Default 12% for new creators
        };
        
        let currentCommissionRate = getCurrentTierRate(effectiveTierLevel);
        
        if (!isInProtectionPeriod && commissionTiers.length > 0) {
          // After protection period, evaluate based on monthly performance
          // Find the highest tier they qualify for based on performance
          let qualifiedTierLevel = 1; // Base tier
          for (const tier of commissionTiers) {
            if (monthlyCount >= tier.monthly_user_threshold) {
              qualifiedTierLevel = tier.tier_level;
            }
          }
          
          // New creators (tier 2+) can only go down if they don't maintain performance
          // But they keep their protected tier during protection period
          effectiveTierLevel = Math.max(qualifiedTierLevel, 1);
          currentCommissionRate = getCurrentTierRate(effectiveTierLevel);
        }

        // Build analytics object
        const analyticsData: CreatorAnalytics = {
          id: creatorProfile.id,
          user_id: creatorProfile.user_id,
          display_name: creatorProfile.display_name,
          referral_code: creatorProfile.referral_code,
          cmo_id: creatorProfile.cmo_id,
          is_active: creatorProfile.is_active,
          created_at: creatorProfile.created_at,
          total_withdrawn: creatorProfile.total_withdrawn,
          available_balance: creatorProfile.available_balance,
          cmo_name: cmoName,
          lifetime_paid_users: creatorProfile.lifetime_paid_users || 0,
          commission_rate: currentCommissionRate / 100, // Store as decimal for backwards compatibility
          monthly_paid_users: monthlyCount,
          total_commission_earned: totalCommission,
          discount_code_count: discountCodeCount || 0,
          total_referred_users: totalReferred || 0,
          tier_protection_until: creatorProfile.tier_protection_until,
          current_tier_level: effectiveTierLevel,
        };

        setCreatorData(analyticsData);
        setTelegramChatId(creatorProfile.telegram_chat_id || '');
        setSavedTelegramChatId(creatorProfile.telegram_chat_id || null);

        // Fetch discount codes
        const { data: dcData } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('creator_id', creatorProfile.id);
        setDiscountCodes(dcData || []);

        // Fetch withdrawal methods
        const { data: wmData } = await supabase
          .from('withdrawal_methods')
          .select('*')
          .eq('creator_id', creatorProfile.id);
        setWithdrawalMethods(wmData || []);

        // Fetch withdrawal requests
        const { data: wrData } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('creator_id', creatorProfile.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setWithdrawalRequests(wrData || []);

        // Fetch monthly data using RPC function
        const { data: monthlyRpcData, error: monthlyError } = await supabase
          .rpc('get_creator_monthly_data', { 
            p_creator_id: creatorProfile.id,
            p_months: 6 
          });

        if (!monthlyError && monthlyRpcData) {
          setMonthlyData(monthlyRpcData.map((m: any) => ({
            month: m.month,
            earnings: Number(m.earnings) || 0,
            referrals: Number(m.referrals) || 0,
            conversions: Number(m.conversions) || 0,
          })));
        }

        // Fetch daily earnings for calendar
        const { data: dailyData } = await supabase
          .from('payment_attributions')
          .select('created_at, creator_commission_amount')
          .eq('creator_id', creatorProfile.id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (dailyData) {
          const dailyMap: Record<string, number> = {};
          dailyData.forEach(p => {
            const date = new Date(p.created_at).toISOString().split('T')[0];
            dailyMap[date] = (dailyMap[date] || 0) + Number(p.creator_commission_amount || 0);
          });
          setDailyEarnings(Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })));
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

  const handleAddWithdrawalMethod = async () => {
    if (!creatorData) return;

    if (methodType === 'bank') {
      if (!bankName || !accountNumber || !accountHolderName) {
        toast.error('Please fill in all bank details');
        return;
      }
    } else {
      if (!walletAddress) {
        toast.error('Please enter wallet address');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('withdrawal_methods').insert({
        creator_id: creatorData.id,
        method_type: methodType,
        bank_name: methodType === 'bank' ? bankName : null,
        account_number: methodType === 'bank' ? accountNumber : null,
        account_holder_name: methodType === 'bank' ? accountHolderName : null,
        branch_name: methodType === 'bank' ? branchName : null,
        crypto_type: methodType === 'crypto' ? cryptoType : null,
        wallet_address: methodType === 'crypto' ? walletAddress : null,
        network: methodType === 'crypto' ? network : null,
        is_primary: withdrawalMethods.length === 0,
      });

      if (error) throw error;

      toast.success('Withdrawal method added!');
      setAddMethodDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error: any) {
      console.error('Error adding withdrawal method:', error);
      toast.error(error.message || 'Failed to add withdrawal method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!creatorData || !selectedMethodId) {
      toast.error('Please select a withdrawal method');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Basic client-side validation (backend will re-validate)
    if (amount < minimumPayout) {
      toast.error(`Minimum withdrawal is LKR ${minimumPayout.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Call secure edge function instead of direct database insert
      const { data, error } = await supabase.functions.invoke('process-withdrawal/request', {
        body: {
          withdrawal_method_id: selectedMethodId,
          amount,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit withdrawal request');
      }

      toast.success(`Withdrawal request submitted! Net amount: Rs. ${data.net_amount?.toLocaleString() || amount}`);
      setWithdrawDialogOpen(false);
      setWithdrawAmount('');
      setSelectedMethodId('');
      fetchData();
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDiscountCode = async () => {
    if (!creatorData) return;
    
    if (discountCodes.length >= MAX_DISCOUNT_CODES) {
      toast.error(`You can only create up to ${MAX_DISCOUNT_CODES} discount codes`);
      return;
    }

    const code = newDiscountCode.trim().toUpperCase();

    if (!code || code.length < 4 || code.length > 20) {
      toast.error('Code must be 4-20 characters');
      return;
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
      toast.error('Code can only contain letters and numbers');
      return;
    }

    setIsSubmitting(true);

    try {
      // Fixed discount at 10% - creators don't choose percentage
      const { error } = await supabase.from('discount_codes').insert({
        creator_id: creatorData.id,
        code,
        discount_percent: 10, // Fixed 10% discount for all creator codes
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('This code already exists. Try a different one.');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Discount code created with 10% discount!');
      setAddDiscountCodeDialogOpen(false);
      setNewDiscountCode('');
      fetchData();
    } catch (error: any) {
      console.error('Error creating discount code:', error);
      toast.error(error.message || 'Failed to create discount code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDiscountCode = async (codeId: string, codeName: string) => {
    if (!creatorData) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete the discount code "${codeName}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', codeId)
        .eq('creator_id', creatorData.id);

      if (error) throw error;

      toast.success('Discount code deleted');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting discount code:', error);
      toast.error(error.message || 'Failed to delete discount code');
    }
  };

  const handleSaveTelegramChatId = async () => {
    if (!creatorData) return;
    
    setIsSavingTelegram(true);
    try {
      const trimmedId = telegramChatId.trim() || null;
      const { error } = await supabase
        .from('creator_profiles')
        .update({ telegram_chat_id: trimmedId })
        .eq('id', creatorData.id);

      if (error) throw error;

      // Update saved state to match what's now in the database
      setSavedTelegramChatId(trimmedId);
      
      toast.success(trimmedId 
        ? 'Telegram notifications enabled!' 
        : 'Telegram notifications disabled'
      );
    } catch (error: any) {
      console.error('Error saving Telegram Chat ID:', error);
      toast.error(error.message || 'Failed to save Telegram settings');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const resetForms = () => {
    setBankName('');
    setAccountNumber('');
    setAccountHolderName('');
    setBranchName('');
    setCryptoType('USDT');
    setWalletAddress('');
    setNetwork('TRC20');
  };

  const handleWithdrawAll = () => {
    setWithdrawAmount((creatorData?.available_balance || 0).toString());
  };

  const referralLink = creatorData 
    ? `${window.location.origin}/signup?ref_creator=${creatorData.referral_code}`
    : '';

  const availableBalance = creatorData?.available_balance || 0;
  const lifetimePaidUsers = creatorData?.lifetime_paid_users || 0;
  const monthlyPaidUsers = creatorData?.monthly_paid_users || 0;
  const totalReferred = creatorData?.total_referred_users || 0;
  const commissionRate = creatorData?.commission_rate || 0.08;
  const totalCommission = creatorData?.total_commission_earned || 0;

  const isEligibleForPayout = monthlyPaidUsers >= 100;
  const feePreview = parseFloat(withdrawAmount) ? parseFloat(withdrawAmount) * 0.03 : 0;
  const netPreview = parseFloat(withdrawAmount) ? parseFloat(withdrawAmount) - feePreview : 0;

  // Get current tier based on tier_protection or performance
  const getCurrentTier = () => {
    const effectiveTierLevel = creatorData?.current_tier_level || 2;
    return commissionTiers.find(t => t.tier_level === effectiveTierLevel) || commissionTiers[0];
  };

  const getNextTier = () => {
    const currentTierLevel = creatorData?.current_tier_level || 2;
    // Find next tier after current
    const sortedTiers = [...commissionTiers].sort((a, b) => a.tier_level - b.tier_level);
    const currentIndex = sortedTiers.findIndex(t => t.tier_level === currentTierLevel);
    return sortedTiers[currentIndex + 1] || null;
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const tierProgress = nextTier 
    ? Math.min((monthlyPaidUsers / nextTier.monthly_user_threshold) * 100, 100)
    : 100;
  const isTopTier = !nextTier;
  const isInProtectionPeriod = creatorData?.tier_protection_until 
    ? new Date(creatorData.tier_protection_until) > new Date()
    : false;


  // Funnel data
  const funnelData = [
    { name: 'Referred', value: totalReferred, color: 'hsl(217, 91%, 60%)' },
    { name: 'Converted', value: lifetimePaidUsers, color: 'hsl(45, 93%, 47%)' },
  ];

  const chartColors = {
    primary: 'hsl(45, 93%, 47%)',
    secondary: 'hsl(217, 91%, 60%)',
    tertiary: 'hsl(142, 71%, 45%)',
    quaternary: 'hsl(262, 83%, 58%)',
  };

  // Discount code performance data for chart
  const discountCodeData = discountCodes.map(dc => ({
    name: dc.code,
    conversions: dc.paid_conversions,
    usage: dc.usage_count,
  }));

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme relative overflow-hidden">
      {/* Premium background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-brand/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-blue-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-[50%] right-[30%] w-[250px] h-[250px] bg-purple-500/6 rounded-full blur-[80px]" />
      </div>
      
      {/* Header */}
      <header className="bg-card/80 border-b border-border backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-transparent to-brand/5 pointer-events-none" />
        <div className="container mx-auto px-4 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground hover:text-brand transition-colors">
                Creator Dashboard
              </Link>
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand/20 to-brand/10 text-brand text-xs font-semibold border border-brand/20">
                Creator
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm hidden sm:block">{profile?.full_name || user?.email}</span>
              <InboxButton />
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Last Updated Timestamp */}
        <div className="flex items-center justify-end mb-2">
          <p className="text-xs text-muted-foreground">
            {lastUpdated ? `Last updated: ${format(lastUpdated, 'PPp')}` : ''}
          </p>
        </div>

        {/* Welcome - Enhanced */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            Welcome back, <span className="text-brand-gradient">{creatorData?.display_name || profile?.full_name || 'Creator'}</span>
          </h1>
          <p className="text-muted-foreground">
            Here's how your referrals are performing
          </p>
        </div>

        {/* Trial Status - Show for creators with trial_expires_at */}
        {creatorData && (
          <div className="mb-8">
            <SubscriptionStatus 
              expiresAt={(creatorData as any).trial_expires_at || null}
              tier="standard"
              type="creator"
              createdAt={creatorData.created_at}
            />
          </div>
        )}

        {/* Stats Cards - Enhanced with gradients and glow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{totalReferred}</p>
              <p className="text-muted-foreground text-sm">Total Users Referred</p>
            </div>
          </div>

          <div className="glass-card p-6 relative overflow-hidden group hover:border-green-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center border border-green-500/20 shadow-lg shadow-green-500/10">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{monthlyPaidUsers}</p>
              <p className="text-muted-foreground text-sm">Paid Users This Month</p>
            </div>
          </div>

          <div className="glass-card p-6 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/10">
                  <Award className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{lifetimePaidUsers}</p>
              <p className="text-muted-foreground text-sm">Lifetime Paid Users</p>
            </div>
          </div>

          <div className="glass-card p-6 relative overflow-hidden group hover:border-brand/40 transition-all duration-300 animate-border-flow border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/40 to-brand/20 flex items-center justify-center border border-brand/30">
                  <Wallet className="w-6 h-6 text-brand" />
                </div>
              </div>
              <p className="text-3xl font-bold text-brand mb-1">LKR {availableBalance.toLocaleString()}</p>
              <p className="text-muted-foreground text-sm">Available Balance</p>
            </div>
          </div>
        </div>

        {/* Contact CMO Section */}
        {creatorData?.cmo_id && creatorData?.cmo_name && (
          <div className="glass-card p-6 mb-8 border-purple-500/20 hover:border-purple-500/30 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Headphones className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Need Support?</h3>
                  <p className="text-sm text-muted-foreground">Contact your CMO: <span className="text-purple-400 font-medium">{creatorData.cmo_name}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {cmoContactInfo?.email && (
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <a href={`mailto:${cmoContactInfo.email}`}>
                      <Mail className="w-4 h-4" />
                      <span className="hidden sm:inline">Email</span>
                    </a>
                  </Button>
                )}
                {cmoContactInfo?.whatsapp && (
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <a href={`https://wa.me/${cmoContactInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  </Button>
                )}
                {cmoContactInfo?.instagram && (
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <a href={`https://instagram.com/${cmoContactInfo.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span className="hidden sm:inline">Instagram</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Earnings Chart */}
          <div className="glass-card p-6 hover:border-brand/20 transition-colors">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand" />
              Monthly Earnings
            </h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Earnings']}
                  />
                  <Area type="monotone" dataKey="earnings" stroke={chartColors.primary} fill="url(#earningsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={funnelData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend items={funnelData.map(d => ({ name: d.name, color: d.color }))} />
          </div>
        </div>

        {/* Commission Tier Progress - Enhanced Visual Display */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground text-lg">Your Commission Tier</h3>
            <p className="text-sm text-muted-foreground">
              {isInProtectionPeriod 
                ? `🛡️ Protected until ${format(new Date(creatorData?.tier_protection_until!), 'PP')} - maintain ${currentTier?.monthly_user_threshold || 0}+ users/month to keep your tier`
                : isTopTier 
                  ? `Congratulations! You've reached the highest tier!` 
                  : `Get ${(nextTier?.monthly_user_threshold || 0) - monthlyPaidUsers} more users this month to unlock ${nextTier?.commission_rate}%`}
            </p>
          </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-brand">{currentTier?.commission_rate || 8}%</p>
              <p className="text-xs text-muted-foreground">Current Rate</p>
            </div>
          </div>
          
          {/* Visual Tier Cards */}
          {commissionTiers.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {commissionTiers.map((tier, index) => {
                const isCurrentTier = currentTier?.tier_level === tier.tier_level;
                const isPastTier = (creatorData?.current_tier_level || 2) > tier.tier_level;
                const isFutureTier = (creatorData?.current_tier_level || 2) < tier.tier_level;
                
                return (
                  <div 
                    key={tier.id}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isCurrentTier 
                        ? 'border-brand bg-brand/10 shadow-lg shadow-brand/20' 
                        : isPastTier
                          ? 'border-green-500/50 bg-green-500/5'
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    {/* You Are Here Indicator */}
                    {isCurrentTier && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="bg-brand text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          YOU ARE HERE
                        </div>
                        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-brand" />
                      </div>
                    )}
                    
                    {/* Tier Content */}
                    <div className={`text-center ${isCurrentTier ? 'pt-2' : ''}`}>
                      <p className={`text-xs font-medium mb-1 ${
                        isCurrentTier ? 'text-brand' : isPastTier ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {tier.tier_name}
                      </p>
                      <p className={`text-2xl font-bold mb-1 ${
                        isCurrentTier ? 'text-brand' : isPastTier ? 'text-green-500' : 'text-foreground'
                      }`}>
                        {tier.commission_rate}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tier.monthly_user_threshold === 0 ? '0+ users' : `${tier.monthly_user_threshold}+ users`}
                      </p>
                      
                      {/* Status indicator */}
                      {isPastTier && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-green-500">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[10px]">Unlocked</span>
                        </div>
                      )}
                      {isFutureTier && !isCurrentTier && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px]">{tier.monthly_user_threshold - monthlyPaidUsers} to go</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${isTopTier ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-brand to-yellow-400'}`}
                style={{ width: `${tierProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {monthlyPaidUsers} users this month
              </span>
              <span>
                {nextTier ? `Next: ${nextTier.monthly_user_threshold} users for ${nextTier.commission_rate}%` : '🎉 Top tier achieved!'}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Your Referral Link</h3>
              <p className="text-sm text-muted-foreground">Share to earn commissions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input 
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <QRCodeModal 
              url={referralLink} 
              referralCode={creatorData?.referral_code || ''} 
              title="Share Your Referral Link"
            />
            <Button 
              variant="outline" 
              onClick={() => copyToClipboard(referralLink, 'Referral link')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Referral Code: <span className="font-mono font-medium">{creatorData?.referral_code}</span>
          </p>
        </div>

        {/* Telegram Notifications */}
        <div className="glass-card p-6 mb-8 border-blue-500/20 hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Telegram Notifications</h3>
              <p className="text-sm text-muted-foreground">Get instant alerts on your phone</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20 mb-4">
            <p className="text-sm text-foreground mb-3">
              <strong>How to set up:</strong>
            </p>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Open Telegram and search for <span className="font-mono text-blue-400">@NotebaseCreatorBot</span></li>
              <li>Start a chat and send <span className="font-mono text-blue-400">/start</span></li>
              <li>The bot will reply with your Chat ID - copy it</li>
              <li>Paste the Chat ID below and save</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter your Telegram Chat ID (e.g., 123456789)"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="font-mono"
            />
            <Button 
              onClick={handleSaveTelegramChatId} 
              disabled={isSavingTelegram}
              variant={telegramChatId ? 'default' : 'outline'}
            >
              {isSavingTelegram ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {savedTelegramChatId && savedTelegramChatId === telegramChatId.trim() && (
            <div className="mt-3 flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Connected - You'll receive notifications for commissions and withdrawals</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            💡 You'll receive brief alerts. Full details are always in your inbox.
          </p>
        </div>

        {/* Discount Codes */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Discount Codes</h3>
                <p className="text-sm text-muted-foreground">
                  Share with your audience ({discountCodes.length}/{MAX_DISCOUNT_CODES} codes)
                </p>
              </div>
            </div>
            {discountCodes.length < MAX_DISCOUNT_CODES && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAddDiscountCodeDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Code
              </Button>
            )}
          </div>
          {discountCodes.length > 0 ? (
            <>
              {/* Discount Code Usage Analytics Chart */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Usage Analytics</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={discountCodeData}>
                    <XAxis dataKey="name" stroke="#888" fontSize={11} />
                    <YAxis stroke="#888" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="usage" name="Total Uses" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="conversions" name="Paid Conversions" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-500" />
                    <span className="text-xs text-muted-foreground">Total Uses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-xs text-muted-foreground">Paid Conversions</span>
                  </div>
                </div>
              </div>
              
              {/* Discount Code List */}
              <div className="space-y-3">
                {discountCodes.map((dc) => (
                  <div key={dc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <code className="font-mono font-medium text-foreground">{dc.code}</code>
                      <span className="text-xs text-muted-foreground">({dc.discount_percent}% off)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">{dc.paid_conversions} conversions</span>
                        <span className="text-xs text-muted-foreground ml-2">({dc.usage_count} uses)</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(dc.code, 'Discount code')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteDiscountCode(dc.id, dc.code)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm mb-3">No discount codes yet</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAddDiscountCodeDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Your First Code
              </Button>
            </div>
          )}
        </div>

        {/* Withdrawal Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Withdrawal Methods */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Withdrawal Methods</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAddMethodDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            {withdrawalMethods.length > 0 ? (
              <div className="space-y-3">
                {withdrawalMethods.map((wm) => (
                  <div key={wm.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    {wm.method_type === 'bank' ? (
                      <Building2 className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Bitcoin className="w-5 h-5 text-orange-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {wm.method_type === 'bank' ? wm.bank_name : wm.crypto_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wm.method_type === 'bank' 
                          ? `****${wm.account_number?.slice(-4)}` 
                          : `${wm.wallet_address?.slice(0, 8)}...`}
                      </p>
                    </div>
                    {wm.is_primary && (
                      <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Add a withdrawal method to cash out</p>
            )}
          </div>

          {/* Quick Withdraw */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Withdraw Funds</h3>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-foreground">LKR {availableBalance.toLocaleString()}</p>
            </div>
            <Button 
              variant="brand" 
              className="w-full"
              disabled={availableBalance < 100 || withdrawalMethods.length === 0}
              onClick={() => setWithdrawDialogOpen(true)}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
            {withdrawalMethods.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Add a withdrawal method first
              </p>
            )}
            {availableBalance < 100 && withdrawalMethods.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Minimum withdrawal: LKR 100
              </p>
            )}
          </div>
        </div>

        {/* Recent Withdrawals */}
        {withdrawalRequests.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Withdrawals</h3>
            <div className="space-y-3">
              {withdrawalRequests.map((wr) => (
                <div key={wr.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">LKR {wr.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(wr.created_at), 'PP')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      wr.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                      wr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {wr.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Withdrawal Method Dialog */}
      <Dialog open={addMethodDialogOpen} onOpenChange={setAddMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Withdrawal Method</DialogTitle>
            <DialogDescription>
              Add a bank account or crypto wallet for withdrawals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={methodType === 'bank' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMethodType('bank')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Bank
              </Button>
              <Button
                variant={methodType === 'crypto' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMethodType('crypto')}
              >
                <Bitcoin className="w-4 h-4 mr-2" />
                Crypto
              </Button>
            </div>

            {methodType === 'bank' ? (
              <>
                <Input
                  placeholder="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <Input
                  placeholder="Account Number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
                <Input
                  placeholder="Account Holder Name"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
                <Input
                  placeholder="Branch Name (Optional)"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </>
            ) : (
              <>
                <Select value={cryptoType} onValueChange={setCryptoType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crypto" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Wallet Address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMethodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWithdrawalMethod} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-foreground">LKR {availableBalance.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`Max: LKR ${availableBalance.toLocaleString()}`}
                value={withdrawAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  // Cap the amount to available balance
                  if (val > availableBalance) {
                    setWithdrawAmount(availableBalance.toString());
                  } else {
                    setWithdrawAmount(e.target.value);
                  }
                }}
                max={availableBalance}
              />
              <Button variant="outline" onClick={handleWithdrawAll}>
                Max
              </Button>
            </div>
            {parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground">LKR {parseFloat(withdrawAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Fee (3%)</span>
                  <span className="text-red-500">-LKR {feePreview.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">You'll receive</span>
                  <span className="text-green-500">LKR {netPreview.toLocaleString()}</span>
                </div>
              </div>
            )}
            <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal method" />
              </SelectTrigger>
              <SelectContent>
                {withdrawalMethods.map((wm) => (
                  <SelectItem key={wm.id} value={wm.id}>
                    {wm.method_type === 'bank' 
                      ? `${wm.bank_name} - ****${wm.account_number?.slice(-4)}`
                      : `${wm.crypto_type} - ${wm.wallet_address?.slice(0, 8)}...`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Discount Code Dialog */}
      <Dialog open={addDiscountCodeDialogOpen} onOpenChange={setAddDiscountCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
            <DialogDescription>
              Create a custom discount code for your audience ({discountCodes.length}/{MAX_DISCOUNT_CODES} codes used)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Discount Code
              </label>
              <Input
                placeholder="e.g., SUMMER2024"
                value={newDiscountCode}
                onChange={(e) => setNewDiscountCode(e.target.value.toUpperCase())}
                maxLength={20}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1">4-20 characters, letters and numbers only</p>
            </div>
            <div className="p-3 bg-brand/10 rounded-lg border border-brand/20">
              <p className="text-sm text-foreground font-medium mb-1">
                ✨ Fixed 10% Discount
              </p>
              <p className="text-xs text-muted-foreground">
                All creator discount codes provide a 10% discount to your audience. This helps maintain fair pricing while rewarding your referrals.
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tips:</strong> Use memorable codes related to your brand or content. Make it easy for your audience to remember!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDiscountCodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDiscountCode} 
              disabled={isSubmitting || !newDiscountCode.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default CreatorDashboard;