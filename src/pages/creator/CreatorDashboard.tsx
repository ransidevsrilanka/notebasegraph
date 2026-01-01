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
} from 'lucide-react';
import { format } from 'date-fns';

interface CreatorProfile {
  id: string;
  display_name: string;
  referral_code: string;
  lifetime_paid_users: number;
  available_balance: number;
  total_withdrawn: number;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  paid_conversions: number;
  is_active: boolean;
}

interface PayoutSummary {
  payout_month: string;
  paid_users_count: number;
  commission_amount: number;
  status: string;
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

interface Stats {
  totalUsersReferred: number;
  paidUsersThisMonth: number;
  paidUsersLifetime: number;
  pendingEarnings: number;
  paidEarnings: number;
  commissionRate: number;
  availableBalance: number;
}

const CRYPTO_TYPES = ['USDT', 'BTC', 'ETH', 'BNB'];
const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20'];

const CreatorDashboard = () => {
  const { user, profile, isCreator, signOut } = useAuth();
  const navigate = useNavigate();
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [payouts, setPayouts] = useState<PayoutSummary[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsersReferred: 0,
    paidUsersThisMonth: 0,
    paidUsersLifetime: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    commissionRate: 0.08,
    availableBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [addMethodDialogOpen, setAddMethodDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
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

  useEffect(() => {
    if (!isCreator) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isCreator, navigate, user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch creator profile
      const { data: cpData, error: cpError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cpError) throw cpError;
      if (cpData) {
        setCreatorProfile(cpData);

        // Determine commission rate based on lifetime paid users
        const commissionRate = cpData.lifetime_paid_users >= 500 ? 0.12 : 0.08;

        // Fetch discount codes
        const { data: dcData } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('creator_id', cpData.id);
        setDiscountCodes(dcData || []);

        // Fetch withdrawal methods
        const { data: wmData } = await supabase
          .from('withdrawal_methods')
          .select('*')
          .eq('creator_id', cpData.id);
        setWithdrawalMethods(wmData || []);

        // Fetch withdrawal requests
        const { data: wrData } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('creator_id', cpData.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setWithdrawalRequests(wrData || []);

        // Fetch user attributions count (all referred users)
        const { count: totalReferred } = await supabase
          .from('user_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', cpData.id);

        // Fetch payment attributions for this month (paid conversions)
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const { data: monthlyPayments } = await supabase
          .from('payment_attributions')
          .select('id')
          .eq('creator_id', cpData.id)
          .gte('created_at', currentMonth.toISOString());
        
        const paidThisMonth = monthlyPayments?.length || 0;

        // Fetch payouts
        const { data: payoutData } = await supabase
          .from('creator_payouts')
          .select('*')
          .eq('creator_id', cpData.id)
          .order('payout_month', { ascending: false })
          .limit(12);

        setPayouts(payoutData || []);

        // Calculate earnings
        const pendingPayouts = (payoutData || []).filter(p => p.status !== 'paid');
        const paidPayouts = (payoutData || []).filter(p => p.status === 'paid');
        
        const pendingEarnings = pendingPayouts.reduce((sum, p) => sum + Number(p.commission_amount || 0), 0);
        const paidEarnings = paidPayouts.reduce((sum, p) => sum + Number(p.commission_amount || 0), 0);

        setStats({
          totalUsersReferred: totalReferred || 0,
          paidUsersThisMonth: paidThisMonth || 0,
          paidUsersLifetime: cpData.lifetime_paid_users || 0,
          pendingEarnings,
          paidEarnings,
          commissionRate,
          availableBalance: cpData.available_balance || 0,
        });
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

  const handleAddWithdrawalMethod = async () => {
    if (!creatorProfile) return;

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
        creator_id: creatorProfile.id,
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
    if (!creatorProfile || !selectedMethodId) {
      toast.error('Please select a withdrawal method');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > stats.availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSubmitting(true);

    try {
      const feePercent = 3;
      const feeAmount = amount * (feePercent / 100);
      const netAmount = amount - feeAmount;

      const { error } = await supabase.from('withdrawal_requests').insert({
        creator_id: creatorProfile.id,
        withdrawal_method_id: selectedMethodId,
        amount,
        fee_percent: feePercent,
        fee_amount: feeAmount,
        net_amount: netAmount,
      });

      if (error) throw error;

      toast.success('Withdrawal request submitted!');
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
    setWithdrawAmount(stats.availableBalance.toString());
  };

  const referralLink = creatorProfile 
    ? `${window.location.origin}/signup?ref_creator=${creatorProfile.referral_code}`
    : '';

  const isEligibleForPayout = stats.paidUsersThisMonth >= 100;
  const feePreview = parseFloat(withdrawAmount) ? parseFloat(withdrawAmount) * 0.03 : 0;
  const netPreview = parseFloat(withdrawAmount) ? parseFloat(withdrawAmount) - feePreview : 0;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                Creator Dashboard
              </Link>
              <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                Creator
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
            Welcome back, {creatorProfile?.display_name || 'Creator'}
          </h1>
          <p className="text-muted-foreground">
            Commission Rate: <span className="text-brand font-semibold">{stats.commissionRate * 100}%</span>
            {stats.paidUsersLifetime < 500 && (
              <span className="text-xs ml-2">
                ({500 - stats.paidUsersLifetime} more paid users until 12%)
              </span>
            )}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsersReferred}</p>
                <p className="text-muted-foreground text-sm">Total Referred</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.paidUsersThisMonth}</p>
                <p className="text-muted-foreground text-sm">Paid This Month</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {stats.availableBalance.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Available Balance</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">LKR {(creatorProfile?.total_withdrawn || 0).toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Total Withdrawn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Eligibility & Withdraw Button */}
        <div className={`glass-card p-4 mb-8 ${isEligibleForPayout ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEligibleForPayout ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Clock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isEligibleForPayout ? (
                    <span className="text-green-500">Eligible for withdrawal!</span>
                  ) : (
                    <span className="text-foreground">Not yet eligible for withdrawal</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isEligibleForPayout 
                    ? 'You can now request a withdrawal.'
                    : `Need ${100 - stats.paidUsersThisMonth} more paid users this month (minimum 100 required)`}
                </p>
              </div>
            </div>
            <Button
              variant="brand"
              size="sm"
              disabled={!isEligibleForPayout || withdrawalMethods.length === 0 || stats.availableBalance <= 0}
              onClick={() => setWithdrawDialogOpen(true)}
            >
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Withdraw
            </Button>
          </div>
        </div>

        {/* Withdrawal Methods */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Withdrawal Methods</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAddMethodDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Method
            </Button>
          </div>
          
          {withdrawalMethods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {withdrawalMethods.map((method) => (
                <div key={method.id} className="p-4 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {method.method_type === 'bank' ? (
                      <Building2 className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Bitcoin className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {method.method_type === 'bank' ? method.bank_name : method.crypto_type}
                    </span>
                    {method.is_primary && (
                      <span className="px-1.5 py-0.5 bg-brand/20 text-brand text-xs rounded">Primary</span>
                    )}
                  </div>
                  {method.method_type === 'bank' ? (
                    <p className="text-xs text-muted-foreground">
                      {method.account_holder_name} • ****{method.account_number?.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {method.network} • {method.wallet_address?.slice(0, 10)}...{method.wallet_address?.slice(-6)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No withdrawal methods added yet. Add a bank account or crypto wallet to receive payments.
            </p>
          )}
        </div>

        {/* Withdrawal History */}
        {withdrawalRequests.length > 0 && (
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Withdrawal History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Net</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRequests.map((wr) => (
                    <tr key={wr.id} className="border-b border-border/50">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {format(new Date(wr.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        LKR {wr.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        LKR {wr.fee_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        LKR {wr.net_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          wr.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                          wr.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
                          wr.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-orange-500/20 text-orange-500'
                        }`}>
                          {wr.status.charAt(0).toUpperCase() + wr.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Link */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Your Referral Link</h2>
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
              Share this link to earn commissions on every paid signup.
            </p>
          </div>

          {/* Discount Codes */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-brand" />
              <h2 className="font-semibold text-foreground">Your Discount Codes</h2>
            </div>
            {discountCodes.length > 0 ? (
              <div className="space-y-3">
                {discountCodes.map((dc) => (
                  <div key={dc.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-mono font-medium text-foreground">{dc.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {dc.discount_percent}% off • {dc.paid_conversions} conversions
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(dc.code, 'Discount code')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No discount codes assigned yet. Contact your CMO to get one.
              </p>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="glass-card p-6 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-foreground">Payout History</h2>
          </div>
          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Month</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Paid Users</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Commission</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.payout_month} className="border-b border-border/50">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {format(new Date(p.payout_month), 'MMMM yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{p.paid_users_count}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        LKR {Number(p.commission_amount || 0).toLocaleString()}
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

      {/* Add Withdrawal Method Dialog */}
      <Dialog open={addMethodDialogOpen} onOpenChange={setAddMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Withdrawal Method</DialogTitle>
            <DialogDescription>
              Add a bank account or crypto wallet to receive payments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Method Type</label>
              <Select value={methodType} onValueChange={(v) => setMethodType(v as 'bank' | 'crypto')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Bank Account
                    </span>
                  </SelectItem>
                  <SelectItem value="crypto">
                    <span className="flex items-center gap-2">
                      <Bitcoin className="w-4 h-4" /> Crypto Wallet
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {methodType === 'bank' ? (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">Bank Name *</label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Commercial Bank"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Account Number *</label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Account Holder Name *</label>
                  <Input
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Name as shown on bank account"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Branch Name (optional)</label>
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Colombo 03"
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">Cryptocurrency *</label>
                  <Select value={cryptoType} onValueChange={setCryptoType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Network *</label>
                  <Select value={network} onValueChange={setNetwork}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_NETWORKS.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Wallet Address *</label>
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter your wallet address"
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMethodDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleAddWithdrawalMethod} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Available balance: LKR {stats.availableBalance.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Withdrawal Method *</label>
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent>
                  {withdrawalMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <span className="flex items-center gap-2">
                        {method.method_type === 'bank' ? (
                          <><Building2 className="w-4 h-4" /> {method.bank_name}</>
                        ) : (
                          <><Bitcoin className="w-4 h-4" /> {method.crypto_type} ({method.network})</>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Amount (LKR) *</label>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleWithdrawAll}>
                  Withdraw All
                </Button>
              </div>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
                max={stats.availableBalance}
              />
            </div>

            {parseFloat(withdrawAmount) > 0 && (
              <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-foreground">LKR {parseFloat(withdrawAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee (3%):</span>
                  <span className="text-red-500">- LKR {feePreview.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-border pt-1 mt-1">
                  <span className="text-foreground">You'll receive:</span>
                  <span className="text-green-500">LKR {netPreview.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="brand" 
              onClick={handleWithdraw} 
              disabled={isSubmitting || !selectedMethodId || !withdrawAmount}
            >
              {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default CreatorDashboard;
