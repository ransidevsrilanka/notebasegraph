import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Download,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface PrintRequest {
  id: string;
  request_number: string;
  user_id: string;
  status: string;
  full_name: string;
  address: string;
  phone: string;
  city: string | null;
  print_type: string;
  subject_name: string;
  estimated_pages: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  tracking_number: string | null;
  admin_notes: string | null;
  receipt_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-500 bg-yellow-500/10',
  confirmed: 'text-blue-500 bg-blue-500/10',
  processing: 'text-purple-500 bg-purple-500/10',
  shipped: 'text-orange-500 bg-orange-500/10',
  delivered: 'text-green-500 bg-green-500/10',
  cancelled: 'text-red-500 bg-red-500/10',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle2 className="w-4 h-4" />,
  processing: <Package className="w-4 h-4" />,
  shipped: <Truck className="w-4 h-4" />,
  delivered: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

const PrintRequests = () => {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PrintRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    let query = supabase
      .from('print_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRequests(data as PrintRequest[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // Calculate stats from actual data
  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    processing: requests.filter(r => r.status === 'processing').length,
    shipped: requests.filter(r => r.status === 'shipped').length,
    delivered: requests.filter(r => r.status === 'delivered').length,
  };

  const sendInboxNotification = async (
    userId: string, 
    subject: string, 
    body: string
  ) => {
    await supabase.from('messages').insert({
      recipient_id: userId,
      recipient_type: 'student',
      recipient_user_id: userId,
      subject,
      body,
      is_read: false,
    });
  };

  const sendTelegramNotification = async (message: string, data: Record<string, unknown>) => {
    try {
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          type: 'print_request_update',
          message,
          data,
          priority: 'medium',
        },
      });
    } catch (err) {
      console.error('Failed to send Telegram notification:', err);
    }
  };

  const handleApprove = async (request: PrintRequest) => {
    setIsUpdating(true);
    
    const { error } = await supabase
      .from('print_requests')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        admin_notes: adminNotes || null,
      })
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to approve request');
    } else {
      // Send inbox notification
      await sendInboxNotification(
        request.user_id,
        `Print Order Confirmed - ${request.request_number}`,
        `Great news! Your print request (${request.request_number}) has been approved and is now being processed. You will receive tracking information once your order ships.`
      );
      
      // Send Telegram notification
      await sendTelegramNotification(
        `✅ Print request ${request.request_number} approved`,
        {
          request_number: request.request_number,
          customer: request.full_name,
          amount: `Rs. ${request.total_amount}`,
        }
      );
      
      toast.success('Request approved and notifications sent');
      fetchRequests();
      setShowDetailDialog(false);
    }
    setIsUpdating(false);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setIsUpdating(true);
    
    const { error } = await supabase
      .from('print_requests')
      .update({
        status: 'cancelled',
        payment_status: 'refund_pending',
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || null,
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      // Send inbox notification with rejection reason
      await sendInboxNotification(
        selectedRequest.user_id,
        `Print Order Update - ${selectedRequest.request_number}`,
        `Unfortunately, we couldn't process your print request (${selectedRequest.request_number}). Reason: ${rejectionReason}. If you paid via bank transfer, a refund will be processed. Please contact support if you have questions.`
      );
      
      // Send Telegram notification
      await sendTelegramNotification(
        `❌ Print request ${selectedRequest.request_number} rejected`,
        {
          request_number: selectedRequest.request_number,
          customer: selectedRequest.full_name,
          reason: rejectionReason,
        }
      );
      
      toast.success('Request rejected and customer notified');
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setRejectionReason('');
      fetchRequests();
    }
    setIsUpdating(false);
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    setIsUpdating(true);
    const updates: Record<string, unknown> = {
      status: newStatus,
      admin_notes: adminNotes || null,
    };

    if (trackingNumber) {
      updates.tracking_number = trackingNumber;
    }

    if (newStatus === 'shipped') {
      updates.shipped_at = new Date().toISOString();
    } else if (newStatus === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      updates.payment_status = 'paid';
    }

    const { error } = await supabase
      .from('print_requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      // Send notification for status updates
      if (selectedRequest && newStatus === 'shipped') {
        await sendInboxNotification(
          selectedRequest.user_id,
          `Your Order Has Shipped! - ${selectedRequest.request_number}`,
          `Your print order (${selectedRequest.request_number}) is on its way!${trackingNumber ? ` Tracking number: ${trackingNumber}.` : ''} Expected delivery in 3-5 business days.`
        );
      } else if (selectedRequest && newStatus === 'delivered') {
        await sendInboxNotification(
          selectedRequest.user_id,
          `Order Delivered - ${selectedRequest.request_number}`,
          `Your print order (${selectedRequest.request_number}) has been delivered. Thank you for using our print service!`
        );
      }
      
      toast.success(`Status updated to ${newStatus}`);
      fetchRequests();
      setShowDetailDialog(false);
    }
    setIsUpdating(false);
  };

  const viewReceipt = (receiptUrl: string) => {
    // Get public URL from Supabase storage
    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(receiptUrl);
    
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    } else {
      toast.error('Receipt not found');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.request_number.toLowerCase().includes(query) ||
      req.full_name.toLowerCase().includes(query) ||
      req.phone.includes(query) ||
      req.subject_name.toLowerCase().includes(query)
    );
  });

  const openDetails = (request: PrintRequest) => {
    setSelectedRequest(request);
    setTrackingNumber(request.tracking_number || '');
    setAdminNotes(request.admin_notes || '');
    setShowDetailDialog(true);
  };

  const isPendingBankTransfer = (request: PrintRequest) => 
    request.payment_method === 'bank_transfer' && 
    request.status === 'pending' && 
    request.payment_status !== 'paid';

  return (
    <main className="min-h-screen bg-background dashboard-theme admin-premium-bg">
      <header className="bg-vault-surface/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Print Requests</h1>
              <p className="text-muted-foreground text-sm">Manage printout orders and fulfillment</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or request #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={fetchRequests}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats - Using calculated values from data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(['pending', 'processing', 'shipped', 'delivered'] as const).map((status) => (
            <div key={status} className="glass-card p-4">
              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
                {STATUS_ICONS[status]}
                <span className="capitalize">{status}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {stats[status]}
              </p>
            </div>
          ))}
        </div>

        {/* Requests List */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Printer className="w-5 h-5 text-brand" />
              Requests ({filteredRequests.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Request #</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Customer</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Subject</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Type</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Amount</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Payment</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Date</th>
                    <th className="text-right p-3 text-muted-foreground text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-mono text-sm text-foreground">{request.request_number}</td>
                      <td className="p-3">
                        <p className="text-foreground font-medium text-sm">{request.full_name}</p>
                        <p className="text-muted-foreground text-xs">{request.phone}</p>
                      </td>
                      <td className="p-3 text-foreground text-sm">{request.subject_name}</td>
                      <td className="p-3 text-foreground text-sm capitalize">{request.print_type.replace(/_/g, ' ')}</td>
                      <td className="p-3 text-foreground text-sm font-medium">Rs. {request.total_amount?.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.payment_status === 'paid' 
                              ? 'text-green-500 bg-green-500/10'
                              : request.payment_status === 'pending_verification'
                              ? 'text-orange-500 bg-orange-500/10'
                              : 'text-yellow-500 bg-yellow-500/10'
                          }`}>
                            {request.payment_status?.replace(/_/g, ' ')}
                          </span>
                          {request.receipt_url && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => viewReceipt(request.receipt_url!)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                          {STATUS_ICONS[request.status]}
                          <span className="capitalize">{request.status}</span>
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(request)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog - Horizontal Layout */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details - {selectedRequest?.request_number}</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Order Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Customer</p>
                    <p className="font-medium text-foreground truncate">{selectedRequest.full_name}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Phone</p>
                    <p className="font-medium text-foreground">{selectedRequest.phone}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Subject</p>
                    <p className="font-medium text-foreground truncate">{selectedRequest.subject_name}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Type</p>
                    <p className="font-medium text-foreground capitalize">{selectedRequest.print_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Pages</p>
                    <p className="font-medium text-foreground">{selectedRequest.estimated_pages}</p>
                  </div>
                  <div className="p-2 bg-brand/10 border border-brand/30 rounded">
                    <p className="text-[10px] text-brand uppercase">Total</p>
                    <p className="font-bold text-brand">Rs. {selectedRequest.total_amount?.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Payment</p>
                    <p className="font-medium text-foreground capitalize">{selectedRequest.payment_method?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                    <p className={`font-medium ${selectedRequest.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {selectedRequest.payment_status?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="p-2 bg-secondary/50 rounded text-sm">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Address</p>
                  <p className="font-medium text-foreground">{selectedRequest.address}{selectedRequest.city && `, ${selectedRequest.city}`}</p>
                </div>

                {/* Receipt Button */}
                {selectedRequest.receipt_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => viewReceipt(selectedRequest.receipt_url!)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View Receipt
                  </Button>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="space-y-4">
                {/* Bank Transfer Approval */}
                {isPendingBankTransfer(selectedRequest) && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <p className="font-medium text-orange-500 text-sm">Bank Transfer - Verify</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleApprove(selectedRequest)}
                        disabled={isUpdating}
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isUpdating}
                        size="sm"
                        className="flex-1"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium">Tracking Number</label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Update Status</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                      <Button
                        key={status}
                        variant={selectedRequest.status === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateStatus(selectedRequest.id, status)}
                        disabled={isUpdating}
                        className="capitalize text-xs h-7"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Print Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this request. This will be sent to the customer.
            </p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (e.g., Payment not verified, Invalid receipt)..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isUpdating || !rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default PrintRequests;
