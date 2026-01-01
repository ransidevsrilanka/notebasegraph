import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

interface OrphanedPayment {
  order_id: string;
  user_id: string | null;
  user_email: string | null;
  amount: number | null;
  tier: string | null;
  ref_creator: string | null;
  discount_code: string | null;
  enrollment_id: string | null;
  created_at: string;
  status: string | null;
}

const PaymentReconciliation = () => {
  const [orphanedPayments, setOrphanedPayments] = useState<OrphanedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [fixingOrderId, setFixingOrderId] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchOrphanedPayments = async () => {
    setIsLoading(true);
    try {
      // Get all completed payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('order_id, user_id, amount, tier, ref_creator, discount_code, enrollment_id, created_at, status')
        .eq('status', 'completed');

      if (paymentsError) throw paymentsError;

      // Get all payment attributions
      const { data: attributions, error: attrError } = await supabase
        .from('payment_attributions')
        .select('order_id');

      if (attrError) throw attrError;

      const attributedOrderIds = new Set((attributions || []).map(a => a.order_id));

      // Find orphaned payments (completed but no attribution)
      const orphaned = (payments || []).filter(p => !attributedOrderIds.has(p.order_id));

      // Fetch user emails for orphaned payments
      const userIds = [...new Set(orphaned.map(p => p.user_id).filter(Boolean))];
      let emailMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        emailMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.email || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      const orphanedWithEmails = orphaned.map(p => ({
        ...p,
        user_email: p.user_id ? emailMap[p.user_id] || 'Unknown' : 'Unknown',
      }));

      setOrphanedPayments(orphanedWithEmails);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error fetching orphaned payments:', error);
      toast.error('Failed to fetch payment data');
    }
    setIsLoading(false);
  };

  const fixSinglePayment = async (payment: OrphanedPayment) => {
    if (!payment.user_id) {
      toast.error('Cannot fix payment without user ID');
      return;
    }

    setFixingOrderId(payment.order_id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('admin-finance/finalize-payment', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          order_id: payment.order_id,
          user_id: payment.user_id,
          enrollment_id: payment.enrollment_id,
          payment_type: 'card',
          tier: payment.tier || 'starter',
          original_amount: payment.amount || 0,
          final_amount: payment.amount || 0,
          ref_creator: payment.ref_creator,
          discount_code: payment.discount_code,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create attribution');
      }

      toast.success(`Fixed attribution for order ${payment.order_id}`);
      fetchOrphanedPayments();
    } catch (error: any) {
      console.error('Error fixing payment:', error);
      toast.error('Failed to fix payment: ' + error.message);
    }
    setFixingOrderId(null);
  };

  const reconcileAll = async () => {
    if (orphanedPayments.length === 0) {
      toast.info('No orphaned payments to reconcile');
      return;
    }

    setIsReconciling(true);
    let successCount = 0;
    let failCount = 0;

    for (const payment of orphanedPayments) {
      if (!payment.user_id) {
        failCount++;
        continue;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) continue;

        const response = await supabase.functions.invoke('admin-finance/finalize-payment', {
          headers: { Authorization: `Bearer ${token}` },
          body: {
            order_id: payment.order_id,
            user_id: payment.user_id,
            enrollment_id: payment.enrollment_id,
            payment_type: 'card',
            tier: payment.tier || 'starter',
            original_amount: payment.amount || 0,
            final_amount: payment.amount || 0,
            ref_creator: payment.ref_creator,
            discount_code: payment.discount_code,
          },
        });

        if (response.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    toast.success(`Reconciliation complete: ${successCount} fixed, ${failCount} failed`);
    fetchOrphanedPayments();
    setIsReconciling(false);
  };

  useEffect(() => {
    fetchOrphanedPayments();
  }, []);

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-display text-xl font-bold text-foreground">
                Payment Reconciliation
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrphanedPayments}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={reconcileAll}
                disabled={isReconciling || orphanedPayments.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-background"
              >
                {isReconciling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Reconcile All ({orphanedPayments.length})
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {orphanedPayments.length > 0 ? (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              )}
              <div>
                <h2 className="font-semibold text-foreground">
                  {orphanedPayments.length > 0
                    ? `${orphanedPayments.length} Orphaned Payment${orphanedPayments.length > 1 ? 's' : ''} Found`
                    : 'All Payments Synced'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {orphanedPayments.length > 0
                    ? 'These payments are completed but missing attribution records'
                    : 'No discrepancies detected between payments and attributions'}
                </p>
              </div>
            </div>
            {lastChecked && (
              <p className="text-xs text-muted-foreground">
                Last checked: {format(lastChecked, 'PPp')}
              </p>
            )}
          </div>
        </div>

        {/* Orphaned Payments Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orphanedPayments.length > 0 ? (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tier</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creator Ref</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orphanedPayments.map((payment) => (
                    <tr key={payment.order_id} className="hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded">
                          {payment.order_id.slice(0, 12)}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {payment.user_email}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        Rs. {(payment.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-muted text-foreground capitalize">
                          {payment.tier || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {payment.ref_creator || payment.discount_code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(payment.created_at), 'PP')}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fixSinglePayment(payment)}
                          disabled={fixingOrderId === payment.order_id || !payment.user_id}
                        >
                          {fixingOrderId === payment.order_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Fix'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All Clear!</h3>
            <p className="text-muted-foreground">
              Every completed payment has a matching attribution record.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default PaymentReconciliation;
