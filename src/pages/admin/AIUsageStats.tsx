import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Users, AlertTriangle, TrendingUp, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AIUsageStats = () => {
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Fetch admin sidebar stats
  const { data: sidebarStats } = useQuery({
    queryKey: ['admin-sidebar-stats'],
    queryFn: async () => {
      const [joinResult, upgradeResult, withdrawalResult, headOpsResult, printResult] = await Promise.all([
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('head_ops_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('print_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return { 
        pendingJoinRequests: joinResult.count ?? 0, 
        pendingUpgrades: upgradeResult.count ?? 0, 
        pendingWithdrawals: withdrawalResult.count ?? 0,
        pendingHeadOpsRequests: headOpsResult.count ?? 0,
        pendingPrintRequests: printResult.count ?? 0,
      };
    },
  });

  // Fetch overall AI usage stats
  const { data: usageStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ai-usage-stats', currentMonth],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Total credits consumed this month
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('ai_credits')
        .select('credits_used, credits_limit, is_suspended, strikes')
        .eq('month_year', currentMonth);

      if (monthlyError) throw monthlyError;

      const totalUsed = monthlyData?.reduce((sum, r) => sum + (r.credits_used || 0), 0) || 0;
      const activeUsers = monthlyData?.filter(r => (r.credits_used || 0) > 0).length || 0;
      const suspendedCount = monthlyData?.filter(r => r.is_suspended).length || 0;
      const flaggedCount = monthlyData?.filter(r => (r.strikes || 0) > 0 && !r.is_suspended).length || 0;

      return {
        totalCreditsUsed: totalUsed,
        activeUsers,
        suspendedCount,
        flaggedCount,
      };
    },
  });

  // Fetch top AI users
  const { data: topUsers, isLoading: topUsersLoading, refetch: refetchTopUsers } = useQuery({
    queryKey: ['ai-top-users', currentMonth],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_credits')
        .select(`
          id,
          user_id,
          credits_used,
          credits_limit,
          strikes,
          is_suspended,
          enrollment_id
        `)
        .eq('month_year', currentMonth)
        .order('credits_used', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch user emails separately
      const userIds = data?.map(d => d.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data?.map(d => ({
        ...d,
        email: profileMap.get(d.user_id)?.email || 'Unknown',
        fullName: profileMap.get(d.user_id)?.full_name || 'Unknown',
      })) || [];
    },
  });

  // Fetch flagged/suspended users
  const { data: flaggedUsers, isLoading: flaggedLoading, refetch: refetchFlagged } = useQuery({
    queryKey: ['ai-flagged-users', currentMonth],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('month_year', currentMonth)
        .or('is_suspended.eq.true,strikes.gt.0')
        .order('strikes', { ascending: false });

      if (error) throw error;

      // Fetch user emails
      const userIds = data?.map(d => d.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data?.map(d => ({
        ...d,
        email: profileMap.get(d.user_id)?.email || 'Unknown',
        fullName: profileMap.get(d.user_id)?.full_name || 'Unknown',
      })) || [];
    },
  });

  // Toggle suspension mutation
  const toggleSuspension = useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('ai_credits')
        .update({ 
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { suspend }) => {
      toast.success(suspend ? 'User suspended from AI' : 'User unsuspended');
      queryClient.invalidateQueries({ queryKey: ['ai-flagged-users'] });
      queryClient.invalidateQueries({ queryKey: ['ai-top-users'] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-stats'] });
    },
    onError: () => {
      toast.error('Failed to update suspension status');
    },
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar stats={{
          pendingJoinRequests: sidebarStats?.pendingJoinRequests ?? 0,
          pendingUpgrades: sidebarStats?.pendingUpgrades ?? 0,
          pendingWithdrawals: sidebarStats?.pendingWithdrawals ?? 0,
          pendingHeadOpsRequests: sidebarStats?.pendingHeadOpsRequests ?? 0,
          pendingPrintRequests: sidebarStats?.pendingPrintRequests ?? 0,
        }} />
        
        <main className="flex-1 p-6 overflow-auto admin-premium-bg">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">AI Usage Statistics</h1>
                <p className="text-muted-foreground">
                  Monitor NotebaseAI usage, credits, and flagged users for {format(new Date(), 'MMMM yyyy')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchStats();
                  refetchTopUsers();
                  refetchFlagged();
                  toast.success('Stats refreshed');
                }}
                disabled={statsLoading || topUsersLoading || flaggedLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading || topUsersLoading || flaggedLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Credits Used</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <span className="text-2xl font-bold">
                      {statsLoading ? '...' : usageStats?.totalCreditsUsed.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active AI Users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">
                      {statsLoading ? '...' : usageStats?.activeUsers}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Flagged Users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">
                      {statsLoading ? '...' : usageStats?.flaggedCount}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Suspended Users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-destructive" />
                    <span className="text-2xl font-bold">
                      {statsLoading ? '...' : usageStats?.suspendedCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Top AI Users This Month
                </CardTitle>
                <CardDescription>Users ranked by credits consumed</CardDescription>
              </CardHeader>
              <CardContent>
                {topUsersLoading ? (
                  <p className="text-muted-foreground py-4">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Credits Used</TableHead>
                        <TableHead>Limit</TableHead>
                        <TableHead>Usage %</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topUsers?.map((user) => {
                        const usagePercent = Math.round(((user.credits_used || 0) / user.credits_limit) * 100);
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{(user.credits_used || 0).toLocaleString()}</TableCell>
                            <TableCell>{user.credits_limit.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={usagePercent > 80 ? 'destructive' : usagePercent > 50 ? 'secondary' : 'outline'}>
                                {usagePercent}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.is_suspended ? (
                                <Badge variant="destructive">Suspended</Badge>
                              ) : (user.strikes || 0) > 0 ? (
                                <Badge variant="secondary">{user.strikes} strikes</Badge>
                              ) : (
                                <Badge variant="outline">Active</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Flagged Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Flagged & Suspended Users
                </CardTitle>
                <CardDescription>Users with strikes or suspended accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {flaggedLoading ? (
                  <p className="text-muted-foreground py-4">Loading...</p>
                ) : flaggedUsers?.length === 0 ? (
                  <p className="text-muted-foreground py-4">No flagged users</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Strikes</TableHead>
                        <TableHead>Credits Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.strikes >= 3 ? 'destructive' : 'secondary'}>
                              {user.strikes}/3
                            </Badge>
                          </TableCell>
                          <TableCell>{(user.credits_used || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleSuspension.mutate({ id: user.id, suspend: false })}
                                disabled={toggleSuspension.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Unsuspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => toggleSuspension.mutate({ id: user.id, suspend: true })}
                                disabled={toggleSuspension.isPending}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Suspend
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AIUsageStats;
