import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  BookOpen,
  DollarSign,
  Target,
  FileText,
  UserX,
  BarChart3,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';

interface CMOProfile {
  id: string;
  display_name: string;
  referral_code: string;
  is_active: boolean;
  user_id: string;
  is_head_ops: boolean;
}

interface CreatorProfile {
  id: string;
  display_name: string;
  referral_code: string;
  cmo_id: string | null;
  lifetime_paid_users: number;
  monthly_paid_users: number;
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

interface ContentOverview {
  subject_id: string;
  subject_name: string;
  grade: string;
  stream: string;
  topic_count: number;
  note_count: number;
  is_active: boolean;
}

interface CMOPerformance {
  cmo_id: string;
  display_name: string;
  creators_count: number;
  total_paid_users: number;
  monthly_paid_users: number;
  is_active: boolean;
}

interface PlatformFinancials {
  total_revenue: number;
  referral_revenue: number;
  non_referral_revenue: number;
  this_month_revenue: number;
  total_paid_users: number;
}

const HeadOpsDashboard = () => {
  const { user, isHeadOps } = useAuth();
  const navigate = useNavigate();
  const [cmos, setCMOs] = useState<CMOProfile[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [myRequests, setMyRequests] = useState<HeadOpsRequest[]>([]);
  const [contentOverview, setContentOverview] = useState<ContentOverview[]>([]);
  const [cmoPerformance, setCMOPerformance] = useState<CMOPerformance[]>([]);
  const [financials, setFinancials] = useState<PlatformFinancials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Request form state
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [requestDetails, setRequestDetails] = useState('');

  // Redirect non-head-ops users
  useEffect(() => {
    if (!isLoading && !isHeadOps) {
      navigate('/cmo/dashboard', { replace: true });
    }
  }, [isHeadOps, isLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch CMOs (excluding self if head ops)
    const { data: cmosData } = await supabase
      .from('cmo_profiles')
      .select('*')
      .order('display_name');
    
    if (cmosData) setCMOs(cmosData);

    // Fetch all creators
    const { data: creatorsData } = await supabase
      .from('creator_profiles')
      .select('*')
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

    // Fetch content overview
    const { data: contentData } = await supabase
      .from('subjects')
      .select(`
        id,
        name,
        grade,
        stream,
        is_active,
        topics (id),
        notes:topics(notes(id))
      `)
      .order('grade')
      .order('stream');
    
    if (contentData) {
      const overview = contentData.map(s => ({
        subject_id: s.id,
        subject_name: s.name,
        grade: s.grade || '',
        stream: s.stream || '',
        topic_count: (s.topics as any[])?.length || 0,
        note_count: (s.topics as any[])?.reduce((acc: number, t: any) => acc + (t.notes?.length || 0), 0) || 0,
        is_active: s.is_active ?? true
      }));
      setContentOverview(overview);
    }

    // Fetch CMO performance data
    const { data: cmoData } = await supabase
      .from('cmo_profiles')
      .select(`
        id,
        display_name,
        is_active,
        creator_profiles (id, lifetime_paid_users, monthly_paid_users)
      `)
      .order('display_name');
    
    if (cmoData) {
      const performance = cmoData.map(cmo => ({
        cmo_id: cmo.id,
        display_name: cmo.display_name || 'Unknown',
        is_active: cmo.is_active ?? true,
        creators_count: (cmo.creator_profiles as any[])?.length || 0,
        total_paid_users: (cmo.creator_profiles as any[])?.reduce((acc: number, c: any) => acc + (c.lifetime_paid_users || 0), 0) || 0,
        monthly_paid_users: (cmo.creator_profiles as any[])?.reduce((acc: number, c: any) => acc + (c.monthly_paid_users || 0), 0) || 0
      }));
      setCMOPerformance(performance);
    }

    // Fetch platform financials (aggregate only - no details)
    const { data: paData } = await supabase
      .from('payment_attributions')
      .select('final_amount, creator_id, created_at, user_id');
    
    if (paData) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const financialSummary: PlatformFinancials = {
        total_revenue: paData.reduce((sum, p) => sum + (p.final_amount || 0), 0),
        referral_revenue: paData.filter(p => p.creator_id).reduce((sum, p) => sum + (p.final_amount || 0), 0),
        non_referral_revenue: paData.filter(p => !p.creator_id).reduce((sum, p) => sum + (p.final_amount || 0), 0),
        this_month_revenue: paData.filter(p => new Date(p.created_at) >= thisMonth).reduce((sum, p) => sum + (p.final_amount || 0), 0),
        total_paid_users: new Set(paData.map(p => p.user_id)).size
      };
      setFinancials(financialSummary);
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
      'demote_cmo': 'Demote CMO',
      'remove_creator': 'Remove Creator',
      'suspend_creator': 'Suspend Creator',
      'enforce_deadline': 'Enforce Deadline',
      'flag_content': 'Flag Content Issue',
      'escalate': 'Escalate Issue'
    };
    return labels[type] || type;
  };

  const activeCreators = creators.filter(c => c.is_active);
  const inactiveCreators = creators.filter(c => !c.is_active);
  const underperformingCreators = creators.filter(c => c.is_active && (c.lifetime_paid_users || 0) < 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">Head of Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm">Operational oversight and management requests</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand" />
                <span className="text-lg font-bold text-foreground">{cmos.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total CMOs</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-lg font-bold text-foreground">{activeCreators.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Active Creators</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" />
                <span className="text-lg font-bold text-foreground">{inactiveCreators.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Inactive Creators</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand" />
                <span className="text-lg font-bold text-foreground">{contentOverview.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Subjects</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-lg font-bold text-foreground">
                  {myRequests.filter(r => r.status === 'pending').length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-lg font-bold text-foreground">{underperformingCreators.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Need Attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="creators" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full bg-secondary/50">
            <TabsTrigger value="creators">Creators</TabsTrigger>
            <TabsTrigger value="cmos">CMOs</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="requests">Submit Request</TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          </TabsList>

          {/* Creator Management Panel */}
          <TabsContent value="creators">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand" />
                  Creator Management
                </CardTitle>
                <CardDescription>View creator performance and request actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {creators.map((creator) => {
                    const cmo = cmos.find(c => c.id === creator.cmo_id);
                    const isUnderperforming = creator.is_active && (creator.lifetime_paid_users || 0) < 5;
                    
                    return (
                      <div 
                        key={creator.id} 
                        className={`p-4 rounded-lg border ${
                          isUnderperforming ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-secondary/30 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{creator.display_name || 'Unknown'}</p>
                              {!creator.is_active && (
                                <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Inactive</Badge>
                              )}
                              {isUnderperforming && (
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Low Performance
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Code: {creator.referral_code} • CMO: {cmo?.display_name || 'Unassigned'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Monthly: <strong className="text-foreground">{creator.monthly_paid_users || 0}</strong></span>
                              <span>Lifetime: <strong className="text-foreground">{creator.lifetime_paid_users || 0}</strong></span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequestType('remove_creator');
                              setSelectedTarget(creator.id);
                              setRequestDetails(`Request to remove creator: ${creator.display_name}`);
                            }}
                            className="text-xs"
                          >
                            <Flag className="w-3 h-3 mr-1" />
                            Request Action
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CMO Performance Panel */}
          <TabsContent value="cmos">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand" />
                  CMO Performance Monitoring
                </CardTitle>
                <CardDescription>Track CMO targets and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {cmoPerformance.map((cmo) => (
                    <div 
                      key={cmo.cmo_id} 
                      className="p-4 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{cmo.display_name}</p>
                            {!cmo.is_active && (
                              <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Creators: <strong className="text-foreground">{cmo.creators_count}</strong></span>
                            <span>Monthly Users: <strong className="text-foreground">{cmo.monthly_paid_users}</strong></span>
                            <span>Total Users: <strong className="text-foreground">{cmo.total_paid_users}</strong></span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequestType('demote_cmo');
                            setSelectedTarget(cmo.cmo_id);
                            setRequestDetails(`Request regarding CMO: ${cmo.display_name}`);
                          }}
                          className="text-xs"
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Request Action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Oversight Panel */}
          <TabsContent value="content">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand" />
                  Content Oversight
                </CardTitle>
                <CardDescription>Monitor content completion status by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {contentOverview.map((subject) => (
                    <div 
                      key={subject.subject_id} 
                      className={`p-4 rounded-lg border ${
                        subject.note_count === 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-secondary/30 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{subject.subject_name}</p>
                            {!subject.is_active && (
                              <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Inactive</Badge>
                            )}
                            {subject.note_count === 0 && (
                              <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">No Content</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {subject.grade} • {subject.stream}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Topics: <strong className="text-foreground">{subject.topic_count}</strong></span>
                            <span>Notes: <strong className="text-foreground">{subject.note_count}</strong></span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequestType('flag_content');
                            setSelectedTarget(subject.subject_id);
                            setRequestDetails(`Content issue with: ${subject.subject_name}`);
                          }}
                          className="text-xs"
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Flag Issue
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Overview Panel (Read-Only) */}
          <TabsContent value="financials">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-brand" />
                  Financial Overview
                </CardTitle>
                <CardDescription>Read-only platform revenue summary (no payout details)</CardDescription>
              </CardHeader>
              <CardContent>
                {financials ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-foreground">
                        LKR {financials.total_revenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">This Month</p>
                      <p className="text-2xl font-bold text-green-500">
                        LKR {financials.this_month_revenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Total Paid Users</p>
                      <p className="text-2xl font-bold text-foreground">
                        {financials.total_paid_users}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-brand/10 border border-brand/30">
                      <p className="text-xs text-muted-foreground mb-1">Referral Revenue</p>
                      <p className="text-xl font-bold text-brand">
                        LKR {financials.referral_revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {financials.total_revenue > 0 
                          ? `${((financials.referral_revenue / financials.total_revenue) * 100).toFixed(1)}% of total`
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Non-Referral Revenue</p>
                      <p className="text-xl font-bold text-foreground">
                        LKR {financials.non_referral_revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {financials.total_revenue > 0 
                          ? `${((financials.non_referral_revenue / financials.total_revenue) * 100).toFixed(1)}% of total`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No financial data available</p>
                )}
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    This is a read-only view. You cannot access payout schedules, modify commissions, or trigger payments.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Request Panel */}
          <TabsContent value="requests">
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
                    <option value="remove_cmo">Remove CMO</option>
                    <option value="demote_cmo">Demote CMO</option>
                    <option value="remove_creator">Remove Creator</option>
                    <option value="suspend_creator">Suspend Creator</option>
                    <option value="enforce_deadline">Enforce Content Deadline</option>
                    <option value="flag_content">Flag Content Issue</option>
                    <option value="escalate">Escalate Issue</option>
                  </select>
                </div>

                {(selectedRequestType.includes('cmo') || selectedRequestType.includes('creator')) && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Select {selectedRequestType.includes('cmo') ? 'CMO' : 'Creator'}
                    </label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground"
                    >
                      <option value="">Select...</option>
                      {selectedRequestType.includes('cmo') 
                        ? cmos.filter(c => !c.is_head_ops).map(cmo => (
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
                  Submit for Admin Approval
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Requests Panel */}
          <TabsContent value="my-requests">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand" />
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
                        className="p-4 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">
                            {getRequestTypeLabel(request.request_type)}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.details?.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.admin_notes && (
                          <p className="text-xs text-brand mt-2 italic border-t border-border pt-2">
                            Admin response: {request.admin_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HeadOpsDashboard;