import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { toast } from 'sonner';
import { 
  ArrowLeft,
  CreditCard,
  Building2,
  Search,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { TIER_LABELS } from '@/types/database';

interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number | null;
  original_amount: number | null;
  final_amount: number | null;
  tier: string | null;
  order_id: string | null;
  payment_type: string | null;
  creator_id: string | null;
  creator_commission_amount: number | null;
  created_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
  };
  creator?: {
    display_name: string | null;
    referral_code: string | null;
  };
}

const Payments = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'card' | 'bank'>('all');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    cardPayments: 0,
    bankPayments: 0,
    totalCommissions: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, [typeFilter]);

  const fetchPayments = async () => {
    setIsLoading(true);

    let query = supabase
      .from('payment_attributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') {
      query = query.eq('payment_type', typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
      setIsLoading(false);
      return;
    }

    // Fetch profile and creator info for each payment
    const paymentsWithDetails = await Promise.all(
      (data || []).map(async (payment) => {
        const [profileResult, creatorResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', payment.user_id)
            .maybeSingle(),
          payment.creator_id
            ? supabase
                .from('creator_profiles')
                .select('display_name, referral_code')
                .eq('id', payment.creator_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return {
          ...payment,
          profile: profileResult.data,
          creator: creatorResult.data,
        };
      })
    );

    setPayments(paymentsWithDetails);

    // Calculate stats
    const allPayments = data || [];
    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.final_amount || p.amount || 0), 0);
    const cardPayments = allPayments.filter(p => p.payment_type === 'card' || !p.payment_type).length;
    const bankPayments = allPayments.filter(p => p.payment_type === 'bank').length;
    const totalCommissions = allPayments.reduce((sum, p) => sum + (p.creator_commission_amount || 0), 0);

    setStats({
      totalRevenue,
      cardPayments,
      bankPayments,
      totalCommissions,
    });

    setIsLoading(false);
  };

  const filteredPayments = payments.filter((payment) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      payment.order_id?.toLowerCase().includes(search) ||
      payment.profile?.email?.toLowerCase().includes(search) ||
      payment.profile?.full_name?.toLowerCase().includes(search) ||
      payment.creator?.display_name?.toLowerCase().includes(search)
    );
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Payments</h1>
              <p className="text-muted-foreground text-sm">View all student payments</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  Rs. {stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stats.cardPayments}</p>
                <p className="text-xs text-muted-foreground">Card Payments</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stats.bankPayments}</p>
                <p className="text-xs text-muted-foreground">Bank Transfers</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-brand" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  Rs. {stats.totalCommissions.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Commissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="card">Card Only</SelectItem>
              <SelectItem value="bank">Bank Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No payments found</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Order ID</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Tier</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Referrer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-foreground">
                          {payment.profile?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.profile?.email || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {payment.order_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {payment.tier ? TIER_LABELS[payment.tier as keyof typeof TIER_LABELS] : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        Rs. {(payment.final_amount || payment.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          payment.payment_type === 'bank'
                            ? 'bg-purple-500/20 text-purple-500'
                            : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          {payment.payment_type === 'bank' ? (
                            <><Building2 className="w-3 h-3" /> Bank</>
                          ) : (
                            <><CreditCard className="w-3 h-3" /> Card</>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {payment.creator?.display_name || (
                          <span className="text-muted-foreground">Direct</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {payment.creator_commission_amount ? (
                          `Rs. ${payment.creator_commission_amount.toLocaleString()}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Payments;
