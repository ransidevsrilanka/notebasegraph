import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Printer, DollarSign, TrendingUp, Package } from 'lucide-react';
import MiniStatCard from '@/components/dashboard/MiniStatCard';

interface PrintPayment {
  id: string;
  request_number: string;
  full_name: string;
  phone: string;
  subject_name: string;
  total_amount: number;
  estimated_pages: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
}

interface PrintSettings {
  print_cost_per_page: number;
}

const PrintPayments = () => {
  // Fetch stats for sidebar
  const { data: stats = { pendingJoinRequests: 0, pendingUpgrades: 0, pendingWithdrawals: 0, pendingHeadOpsRequests: 0, pendingPrintRequests: 0 } } = useQuery({
    queryKey: ['admin-sidebar-stats'],
    queryFn: async () => {
      const [joinRes, upgradeRes, withdrawalRes, headOpsRes, printRes] = await Promise.all([
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('head_ops_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('print_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return {
        pendingJoinRequests: joinRes.count || 0,
        pendingUpgrades: upgradeRes.count || 0,
        pendingWithdrawals: withdrawalRes.count || 0,
        pendingHeadOpsRequests: headOpsRes.count || 0,
        pendingPrintRequests: printRes.count || 0,
      };
    },
  });

  // Fetch print settings for cost calculation
  const { data: printSettings } = useQuery({
    queryKey: ['print-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_settings')
        .select('print_cost_per_page')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as PrintSettings;
    },
  });

  // Fetch paid print requests
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['print-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_requests')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PrintPayment[];
    },
  });

  const printCostPerPage = printSettings?.print_cost_per_page || 4;

  // Calculate totals
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
  const totalPages = payments.reduce((sum, p) => sum + (p.estimated_pages || 0), 0);
  const totalCost = totalPages * printCostPerPage;
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar stats={stats} />
        <SidebarInset className="flex-1">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Print Payments</h1>
              <p className="text-muted-foreground mt-1">View all completed print request payments and profitability.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MiniStatCard 
                label="Total Revenue" 
                value={totalRevenue} 
                format="currency" 
              />
              <MiniStatCard 
                label="Total Cost" 
                value={totalCost} 
                format="currency" 
              />
              <MiniStatCard 
                label="Net Profit" 
                value={totalProfit} 
                format="currency" 
              />
              <MiniStatCard 
                label="Total Pages" 
                value={totalPages} 
              />
            </div>

            {/* Profit Card */}
            <div className="glass-card-premium p-6 mb-8 bg-gradient-to-r from-purple-500/10 via-brand/5 to-transparent border-purple-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Printer className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-muted-foreground font-medium">Print Profit Summary</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-500">
                    Rs. {totalProfit.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revenue: Rs. {totalRevenue.toLocaleString()} − Cost: Rs. {totalCost.toLocaleString()} (@ Rs.{printCostPerPage}/page)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-lg font-semibold text-foreground">{payments.length}</p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className={`text-lg font-semibold ${profitMargin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profitMargin}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Paid Print Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No paid print orders yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Request #</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Customer</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Subject</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Pages</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Revenue</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Cost</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Profit</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => {
                          const cost = (payment.estimated_pages || 0) * printCostPerPage;
                          const profit = Number(payment.total_amount || 0) - cost;
                          return (
                            <tr key={payment.id} className="border-b border-border/50 hover:bg-secondary/20">
                              <td className="py-3 px-2 font-mono text-sm">{payment.request_number}</td>
                              <td className="py-3 px-2">
                                <div>
                                  <p className="font-medium text-foreground text-sm">{payment.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{payment.phone}</p>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-sm">{payment.subject_name}</td>
                              <td className="py-3 px-2 text-right text-sm">{payment.estimated_pages || 0}</td>
                              <td className="py-3 px-2 text-right text-sm font-medium text-green-500">
                                Rs. {Number(payment.total_amount || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-2 text-right text-sm text-orange-500">
                                Rs. {cost.toLocaleString()}
                              </td>
                              <td className={`py-3 px-2 text-right text-sm font-medium ${profit >= 0 ? 'text-purple-500' : 'text-red-500'}`}>
                                Rs. {profit.toLocaleString()}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant={payment.status === 'delivered' ? 'default' : 'secondary'}>
                                  {payment.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {format(new Date(payment.created_at), 'MMM d, yyyy')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PrintPayments;
