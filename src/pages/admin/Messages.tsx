import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Send, 
  Mail, 
  Users,
  CheckCircle2,
  Clock,
  MailOpen,
  GraduationCap,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS } from '@/types/database';

interface Recipient {
  id: string;
  display_name: string | null;
  email: string | null;
  type: 'creator' | 'cmo' | 'headops' | 'student';
}

interface StudentFilter {
  grade?: string;
  stream?: string;
  medium?: string;
}

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  recipient_id: string | null;
  recipient_user_id: string | null;
  recipient_type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  filter_grade: string | null;
  filter_stream: string | null;
  filter_medium: string | null;
  recipient_name?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [studentRecipients, setStudentRecipients] = useState<Recipient[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Form state
  const [recipientType, setRecipientType] = useState<string>('individual');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // Student filter state
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterStream, setFilterStream] = useState<string>('');
  const [filterMedium, setFilterMedium] = useState<string>('');
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (recipientType.startsWith('students_')) {
      fetchStudentCount();
    }
  }, [recipientType, filterGrade, filterStream, filterMedium]);

  const fetchStudentCount = async () => {
    let query = supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (filterGrade) query = query.eq('grade', filterGrade);
    if (filterStream) query = query.eq('stream', filterStream);
    if (filterMedium) query = query.eq('medium', filterMedium);

    const { count } = await query;
    setStudentCount(count || 0);
  };

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch creators
    const { data: creatorsData } = await supabase
      .from('creator_profiles')
      .select('id, display_name, user_id')
      .eq('is_active', true);

    // Fetch CMOs
    const { data: cmosData } = await supabase
      .from('cmo_profiles')
      .select('id, display_name, user_id, is_head_ops')
      .eq('is_active', true);

    // Get profiles for email
    const allUserIds = [
      ...(creatorsData || []).map(c => c.user_id),
      ...(cmosData || []).map(c => c.user_id),
    ];

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', allUserIds);

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, { email: p.email, name: p.full_name }]));

    // Build recipient list
    const allRecipients: Recipient[] = [
      ...(creatorsData || []).map(c => ({
        id: c.user_id,
        display_name: c.display_name,
        email: profileMap.get(c.user_id)?.email || null,
        type: 'creator' as const,
      })),
      ...(cmosData || []).filter(c => !c.is_head_ops).map(c => ({
        id: c.user_id,
        display_name: c.display_name,
        email: profileMap.get(c.user_id)?.email || null,
        type: 'cmo' as const,
      })),
      ...(cmosData || []).filter(c => c.is_head_ops).map(c => ({
        id: c.user_id,
        display_name: c.display_name,
        email: profileMap.get(c.user_id)?.email || null,
        type: 'headops' as const,
      })),
    ];

    setRecipients(allRecipients);

    // Fetch students for individual targeting
    const { data: studentsData } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('is_active', true)
      .limit(500);

    if (studentsData && studentsData.length > 0) {
      const studentUserIds = studentsData.map(s => s.user_id);
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', studentUserIds);

      const students: Recipient[] = (studentProfiles || []).map(p => ({
        id: p.user_id,
        display_name: p.full_name,
        email: p.email,
        type: 'student' as const,
      }));

      setStudentRecipients(students);
    }

    // Fetch sent messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Add recipient names
    const messagesWithNames = (messagesData || []).map(m => {
      let recipientName = 'Unknown';
      
      if (m.recipient_user_id) {
        const student = studentRecipients.find(r => r.id === m.recipient_user_id);
        recipientName = student?.display_name || student?.email || 'Student';
      } else if (m.recipient_id) {
        const recipient = allRecipients.find(r => r.id === m.recipient_id);
        recipientName = recipient?.display_name || recipient?.email || 'Unknown';
      } else if (m.recipient_type === 'student') {
        const filters = [];
        if (m.filter_grade) filters.push(GRADE_LABELS[m.filter_grade as keyof typeof GRADE_LABELS] || m.filter_grade);
        if (m.filter_stream) filters.push(STREAM_LABELS[m.filter_stream as keyof typeof STREAM_LABELS] || m.filter_stream);
        if (m.filter_medium) filters.push(MEDIUM_LABELS[m.filter_medium as keyof typeof MEDIUM_LABELS] || m.filter_medium);
        recipientName = filters.length > 0 ? `Students: ${filters.join(', ')}` : 'All Students';
      }
      
      return {
        ...m,
        recipient_name: recipientName,
      };
    });

    setSentMessages(messagesWithNames);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (recipientType === 'individual' && !selectedRecipient) {
      toast.error('Please select a recipient');
      return;
    }

    if (recipientType === 'individual_student' && !selectedRecipient) {
      toast.error('Please select a student');
      return;
    }

    setIsSending(true);

    try {
      let messagesToInsert: any[] = [];

      if (recipientType === 'individual') {
        const recipient = recipients.find(r => r.id === selectedRecipient);
        messagesToInsert.push({
          sender_id: user?.id,
          recipient_id: selectedRecipient,
          recipient_type: recipient?.type || 'creator',
          subject,
          body,
          notification_type: 'admin',
        });
      } else if (recipientType === 'individual_student') {
        messagesToInsert.push({
          sender_id: user?.id,
          recipient_user_id: selectedRecipient,
          recipient_type: 'student',
          subject,
          body,
          notification_type: 'admin',
        });
      } else if (recipientType === 'students_filtered') {
        // Send broadcast to filtered students
        messagesToInsert.push({
          sender_id: user?.id,
          recipient_type: 'student',
          filter_grade: filterGrade || null,
          filter_stream: filterStream || null,
          filter_medium: filterMedium || null,
          subject,
          body,
          notification_type: 'admin',
        });
      } else {
        // Send to all of a type (creators, cmos, headops)
        const targetRecipients = recipients.filter(r => {
          if (recipientType === 'all_creators') return r.type === 'creator';
          if (recipientType === 'all_cmos') return r.type === 'cmo';
          if (recipientType === 'all_headops') return r.type === 'headops';
          return false;
        });

        messagesToInsert = targetRecipients.map(r => ({
          sender_id: user?.id,
          recipient_id: r.id,
          recipient_type: r.type,
          subject,
          body,
          notification_type: 'admin',
        }));
      }

      if (messagesToInsert.length === 0) {
        toast.error('No recipients found');
        setIsSending(false);
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (error) throw error;

      const recipientCount = recipientType === 'students_filtered' ? studentCount : messagesToInsert.length;
      toast.success(`Message sent to ${recipientCount} recipient(s)`);
      setSubject('');
      setBody('');
      setSelectedRecipient('');
      setFilterGrade('');
      setFilterStream('');
      setFilterMedium('');
      fetchData();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }

    setIsSending(false);
  };

  const filteredStudents = studentRecipients.filter(s => {
    if (!studentSearch) return true;
    const query = studentSearch.toLowerCase();
    return (
      s.display_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    );
  }).slice(0, 50);

  return (
    <main className="min-h-screen bg-background dashboard-theme admin-premium-bg">
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground text-sm">Send messages to creators, CMOs, Head of Ops, and students</p>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="sent">Sent Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <div className="glass-card p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                New Message
              </h2>

              <div className="space-y-4">
                {/* Recipient Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Send To</Label>
                  <Select value={recipientType} onValueChange={(v) => { setRecipientType(v); setSelectedRecipient(''); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual (Creator/CMO/HOO)</SelectItem>
                      <SelectItem value="individual_student">Individual Student</SelectItem>
                      <SelectItem value="students_filtered">
                        <span className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Students (by Grade/Stream/Medium)
                        </span>
                      </SelectItem>
                      <SelectItem value="all_creators">All Creators ({recipients.filter(r => r.type === 'creator').length})</SelectItem>
                      <SelectItem value="all_cmos">All CMOs ({recipients.filter(r => r.type === 'cmo').length})</SelectItem>
                      <SelectItem value="all_headops">All Head of Ops ({recipients.filter(r => r.type === 'headops').length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Individual Recipient (Creator/CMO/HOO) */}
                {recipientType === 'individual' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Recipient</Label>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {recipients.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No recipients found</div>
                        ) : (
                          recipients.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {r.type === 'headops' ? 'HOO' : r.type.toUpperCase()}
                                </Badge>
                                {r.display_name || r.email || 'Unknown'}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Individual Student */}
                {recipientType === 'individual_student' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Search Student</Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStudents.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No students found</div>
                        ) : (
                          filteredStudents.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">
                                  STUDENT
                                </Badge>
                                {s.display_name || s.email || 'Unknown'}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Student Filters */}
                {recipientType === 'students_filtered' && (
                  <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Filter Students</Label>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                        {studentCount} students
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Grade</Label>
                        <Select value={filterGrade} onValueChange={setFilterGrade}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All grades" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All grades</SelectItem>
                            {Object.entries(GRADE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Stream</Label>
                        <Select value={filterStream} onValueChange={setFilterStream}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All streams" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All streams</SelectItem>
                            {Object.entries(STREAM_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Medium</Label>
                        <Select value={filterMedium} onValueChange={setFilterMedium}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All mediums" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All mediums</SelectItem>
                            {Object.entries(MEDIUM_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Leave filters empty to send to all students. Message will appear in their inbox.
                    </p>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Subject</Label>
                  <Input
                    placeholder="Message subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Body */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Message</Label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button
                  variant="brand"
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-full"
                >
                  {isSending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sent">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sent Messages ({sentMessages.length})
              </h2>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No messages sent yet</div>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{message.subject}</p>
                            {message.is_read ? (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                                <MailOpen className="w-3 h-3 mr-1" />
                                Read
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Unread
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            To: {message.recipient_name}
                          </p>
                          <p className="text-sm text-muted-foreground/80 line-clamp-2">
                            {message.body}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{format(new Date(message.created_at), 'MMM d, yyyy')}</p>
                          <p>{format(new Date(message.created_at), 'h:mm a')}</p>
                          {message.read_at && (
                            <p className="text-green-400 mt-1">
                              Read {format(new Date(message.read_at), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Messages;
