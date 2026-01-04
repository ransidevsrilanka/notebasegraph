import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  UserMinus,
  FileWarning,
  Send,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface CMOProfile {
  id: string;
  display_name: string;
  referral_code: string;
  is_active: boolean;
  user_id: string;
}

interface CreatorProfile {
  id: string;
  display_name: string;
  referral_code: string;
  cmo_id: string;
  lifetime_paid_users: number;
  is_active: boolean;
}

interface HeadOpsRequest {
  id: string;
  request_type: string;
  target_id: string;
  target_type: string;
  details: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const HeadOpsDashboard = () => {
  const { user } = useAuth();
  const [cmos, setCMOs] = useState<CMOProfile[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [myRequests, setMyRequests] = useState<HeadOpsRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Request form state
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [requestDetails, setRequestDetails] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch CMOs
    const { data: cmosData } = await supabase
      .from('cmo_profiles')
      .select('*')
      .eq('is_active', true)
      .order('display_name');
    
    if (cmosData) setCMOs(cmosData);

    // Fetch all creators
    const { data: creatorsData } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('is_active', true)
      .order('display_name');
    
    if (creatorsData) setCreators(creatorsData);

    // Fetch my requests
    if (user) {
      const { data: requestsData } = await supabase
        .from('head_ops_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });
      
      if (requestsData) setMyRequests(requestsData as HeadOpsRequest[]);
    }

    setIsLoading(false);
  };

  const handleSubmitRequest = async () => {
    if (!selectedRequestType || !requestDetails.trim()) {
      toast.error('Please select a request type and provide details');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('head_ops_requests').insert({
      requester_id: user?.id,
      request_type: selectedRequestType,
      target_id: selectedTarget || null,
      target_type: selectedRequestType.includes('cmo') ? 'cmo' : 
                   selectedRequestType.includes('creator') ? 'creator' : null,
      details: { description: requestDetails },
      status: 'pending'
    });

    if (error) {
      toast.error('Failed to submit request');
      console.error(error);
    } else {
      toast.success('Request submitted for admin approval');
      setSelectedRequestType('');
      setSelectedTarget('');
      setRequestDetails('');
      fetchData();

      // Notify admin via Telegram
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          type: 'head_ops_request',
          message: `Head of Ops submitted a ${selectedRequestType} request`,
          data: {
            type: selectedRequestType,
            details: requestDetails.substring(0, 100)
          }
        }
      });
    }

    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'remove_cmo': 'Remove CMO',
      'remove_creator': 'Remove Creator',
      'enforce_deadline': 'Enforce Deadline',
      'escalate': 'Escalate Issue'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/cmo/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Head of Ops Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage operations and submit requests</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{cmos.length}</p>
                  <p className="text-xs text-muted-foreground">Active CMOs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{creators.length}</p>
                  <p className="text-xs text-muted-foreground">Active Creators</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {myRequests.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit Request Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-brand" />
                Submit Request
              </CardTitle>
              <CardDescription>
                All requests require admin approval before execution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Request Type</label>
                <select
                  value={selectedRequestType}
                  onChange={(e) => setSelectedRequestType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground"
                >
                  <option value="">Select a request type...</option>
                  <option value="remove_cmo">Remove / Demote CMO</option>
                  <option value="remove_creator">Remove Creator</option>
                  <option value="enforce_deadline">Enforce Content Deadline</option>
                  <option value="escalate">Escalate Issue</option>
                </select>
              </div>

              {(selectedRequestType === 'remove_cmo' || selectedRequestType === 'remove_creator') && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Select {selectedRequestType === 'remove_cmo' ? 'CMO' : 'Creator'}
                  </label>
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground"
                  >
                    <option value="">Select...</option>
                    {selectedRequestType === 'remove_cmo' 
                      ? cmos.map(cmo => (
                          <option key={cmo.id} value={cmo.id}>{cmo.display_name}</option>
                        ))
                      : creators.map(creator => (
                          <option key={creator.id} value={creator.id}>{creator.display_name}</option>
                        ))
                    }
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Details / Reason</label>
                <Textarea
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  placeholder="Provide detailed reasoning for this request..."
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                variant="brand" 
                onClick={handleSubmitRequest}
                disabled={isSubmitting || !selectedRequestType || !requestDetails.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit for Approval
              </Button>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-brand" />
                My Requests
              </CardTitle>
              <CardDescription>Track the status of your submitted requests</CardDescription>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No requests submitted yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {myRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="p-3 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-foreground">
                          {getRequestTypeLabel(request.request_type)}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {request.details?.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.admin_notes && (
                        <p className="text-xs text-brand mt-2 italic">
                          Admin: {request.admin_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Underperforming Creators Alert */}
        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Performance Alerts
            </CardTitle>
            <CardDescription>Creators who may need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {creators.filter(c => (c.lifetime_paid_users || 0) < 5).slice(0, 5).map(creator => (
                <div key={creator.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{creator.display_name}</p>
                    <p className="text-xs text-muted-foreground">Code: {creator.referral_code}</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                    {creator.lifetime_paid_users || 0} paid users
                  </Badge>
                </div>
              ))}
              {creators.filter(c => (c.lifetime_paid_users || 0) < 5).length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No underperforming creators found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeadOpsDashboard;
