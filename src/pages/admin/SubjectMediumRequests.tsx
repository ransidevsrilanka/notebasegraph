import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  RefreshCw,
  Languages,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface MediumRequest {
  id: string;
  user_id: string;
  enrollment_id: string;
  user_subjects_id: string | null;
  subject_1_new_medium: string | null;
  subject_2_new_medium: string | null;
  subject_3_new_medium: string | null;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  updated_at?: string;
  // Joined data
  profile?: { full_name: string | null; email: string | null };
  user_subjects?: {
    subject_1: string | null;
    subject_2: string | null;
    subject_3: string | null;
  };
}

const SubjectMediumRequests = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [requests, setRequests] = useState<MediumRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; open: boolean }>({ id: '', open: false });
  const [rejectNotes, setRejectNotes] = useState('');
  const [sidebarStats, setSidebarStats] = useState({
    pendingJoinRequests: 0,
    pendingWithdrawals: 0,
    pendingUpgrades: 0,
    pendingHeadOpsRequests: 0,
  });

  useEffect(() => {
    fetchRequests();
    fetchSidebarStats();
  }, []);

  const fetchSidebarStats = async () => {
    const [joins, withdrawals, upgrades, headOps] = await Promise.all([
      supabase.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('upgrade_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('head_ops_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setSidebarStats({
      pendingJoinRequests: joins.count || 0,
      pendingWithdrawals: withdrawals.count || 0,
      pendingUpgrades: upgrades.count || 0,
      pendingHeadOpsRequests: headOps.count || 0,
    });
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('subject_medium_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      // Get user IDs for profile lookup
      const userIds = [...new Set(requestsData.map(r => r.user_id))];
      const subjectIds = [...new Set(requestsData.map(r => r.user_subjects_id).filter(Boolean))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Fetch user_subjects
      const { data: subjects } = await supabase
        .from('user_subjects')
        .select('id, subject_1, subject_2, subject_3')
        .in('id', subjectIds);

      // Merge data
      const merged = requestsData.map(req => ({
        ...req,
        profile: profiles?.find(p => p.user_id === req.user_id),
        user_subjects: subjects?.find(s => s.id === req.user_subjects_id),
      }));

      setRequests(merged);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: MediumRequest) => {
    if (!request.user_subjects_id) {
      toast.error('No user subjects linked to this request');
      return;
    }

    setProcessingId(request.id);
    try {
      // Update user_subjects with new medium values
      const updates: Record<string, string | null> = {};
      if (request.subject_1_new_medium && request.subject_1_new_medium !== 'none') {
        updates.subject_1_medium = request.subject_1_new_medium;
      }
      if (request.subject_2_new_medium && request.subject_2_new_medium !== 'none') {
        updates.subject_2_medium = request.subject_2_new_medium;
      }
      if (request.subject_3_new_medium && request.subject_3_new_medium !== 'none') {
        updates.subject_3_medium = request.subject_3_new_medium;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('user_subjects')
          .update(updates)
          .eq('id', request.user_subjects_id);

        if (updateError) throw updateError;
      }

      // Update request status
      const { error: statusError } = await supabase
        .from('subject_medium_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (statusError) throw statusError;

      toast.success('Request approved and subject mediums updated');
      fetchRequests();
      fetchSidebarStats();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    setProcessingId(rejectDialog.id);
    try {
      const { error } = await supabase
        .from('subject_medium_requests')
        .update({
          status: 'rejected',
          admin_notes: rejectNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rejectDialog.id);

      if (error) throw error;

      toast.success('Request rejected');
      setRejectDialog({ id: '', open: false });
      setRejectNotes('');
      fetchRequests();
      fetchSidebarStats();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.profile?.full_name?.toLowerCase().includes(query) ||
      req.profile?.email?.toLowerCase().includes(query) ||
      req.user_subjects?.subject_1?.toLowerCase().includes(query) ||
      req.user_subjects?.subject_2?.toLowerCase().includes(query) ||
      req.user_subjects?.subject_3?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500/50 text-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500/50 text-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMediumChanges = (req: MediumRequest) => {
    const changes: string[] = [];
    if (req.subject_1_new_medium && req.subject_1_new_medium !== 'none') {
      changes.push(`${req.user_subjects?.subject_1 || 'Subject 1'} → ${req.subject_1_new_medium}`);
    }
    if (req.subject_2_new_medium && req.subject_2_new_medium !== 'none') {
      changes.push(`${req.user_subjects?.subject_2 || 'Subject 2'} → ${req.subject_2_new_medium}`);
    }
    if (req.subject_3_new_medium && req.subject_3_new_medium !== 'none') {
      changes.push(`${req.user_subjects?.subject_3 || 'Subject 3'} → ${req.subject_3_new_medium}`);
    }
    return changes;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AdminSidebar stats={sidebarStats} />
        
        <main className="flex-1 p-6 lg:p-8 overflow-auto admin-premium-bg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Languages className="w-6 h-6 text-brand" />
                Subject Medium Requests
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage student requests to change subject medium
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, email, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Requested Changes</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{req.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getMediumChanges(req).map((change, i) => (
                          <Badge key={i} variant="secondary" className="text-xs mr-1">
                            {change}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {req.reason || '-'}
                      </p>
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                            onClick={() => handleApprove(req)}
                            disabled={processingId === req.id}
                          >
                            {processingId === req.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                            onClick={() => setRejectDialog({ id: req.id, open: true })}
                            disabled={processingId === req.id}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Optional notes for rejection..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog({ id: '', open: false })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId === rejectDialog.id}
              >
                {processingId === rejectDialog.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SubjectMediumRequests;
