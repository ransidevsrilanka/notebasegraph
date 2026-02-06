import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Award, Star, GraduationCap, Users } from 'lucide-react';

interface TeacherTestimonial {
  id: string;
  name: string;
  title: string | null;
  photo_url: string | null;
  message: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface StudentTestimonial {
  id: string;
  name: string;
  grade: string;
  stream: string | null;
  year: string;
  message: string;
  rating: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const TestimonialsSettings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('teachers');
  
  // Teacher dialog state
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherTestimonial | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    title: '',
    photo_url: '',
    message: '',
    sort_order: 0,
  });
  
  // Student dialog state
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentTestimonial | null>(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: 'A/L',
    stream: '',
    year: new Date().getFullYear().toString(),
    message: '',
    rating: 5,
    sort_order: 0,
  });

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

  // Fetch teacher testimonials
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['admin-teacher-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_testimonials')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TeacherTestimonial[];
    },
  });

  // Fetch student testimonials
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['admin-student-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_testimonials')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as StudentTestimonial[];
    },
  });

  // Teacher mutations
  const saveTeacherMutation = useMutation({
    mutationFn: async (data: typeof teacherForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('teacher_testimonials')
          .update({
            name: data.name,
            title: data.title || null,
            photo_url: data.photo_url || null,
            message: data.message,
            sort_order: data.sort_order,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teacher_testimonials')
          .insert({
            name: data.name,
            title: data.title || null,
            photo_url: data.photo_url || null,
            message: data.message,
            sort_order: data.sort_order,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-testimonials'] });
      setTeacherDialogOpen(false);
      setEditingTeacher(null);
      toast.success(editingTeacher ? 'Teacher testimonial updated' : 'Teacher testimonial added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save testimonial');
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teacher_testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-testimonials'] });
      toast.success('Teacher testimonial deleted');
    },
  });

  const toggleTeacherActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('teacher_testimonials')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-testimonials'] });
    },
  });

  // Student mutations
  const saveStudentMutation = useMutation({
    mutationFn: async (data: typeof studentForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('student_testimonials')
          .update({
            name: data.name,
            grade: data.grade,
            stream: data.stream || null,
            year: data.year,
            message: data.message,
            rating: data.rating,
            sort_order: data.sort_order,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('student_testimonials')
          .insert({
            name: data.name,
            grade: data.grade,
            stream: data.stream || null,
            year: data.year,
            message: data.message,
            rating: data.rating,
            sort_order: data.sort_order,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['student-testimonials'] });
      setStudentDialogOpen(false);
      setEditingStudent(null);
      toast.success(editingStudent ? 'Student testimonial updated' : 'Student testimonial added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save testimonial');
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('student_testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['student-testimonials'] });
      toast.success('Student testimonial deleted');
    },
  });

  const toggleStudentActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('student_testimonials')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['student-testimonials'] });
    },
  });

  const openTeacherDialog = (teacher?: TeacherTestimonial) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherForm({
        name: teacher.name,
        title: teacher.title || '',
        photo_url: teacher.photo_url || '',
        message: teacher.message,
        sort_order: teacher.sort_order,
      });
    } else {
      setEditingTeacher(null);
      setTeacherForm({ name: '', title: '', photo_url: '', message: '', sort_order: teachers.length });
    }
    setTeacherDialogOpen(true);
  };

  const openStudentDialog = (student?: StudentTestimonial) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({
        name: student.name,
        grade: student.grade,
        stream: student.stream || '',
        year: student.year,
        message: student.message,
        rating: student.rating,
        sort_order: student.sort_order,
      });
    } else {
      setEditingStudent(null);
      setStudentForm({ name: '', grade: 'A/L', stream: '', year: new Date().getFullYear().toString(), message: '', rating: 5, sort_order: students.length });
    }
    setStudentDialogOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar stats={stats} />
        <SidebarInset className="flex-1">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Testimonials Management</h1>
              <p className="text-muted-foreground mt-1">Manage teacher recommendations and student reviews displayed on the homepage.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="teachers" className="gap-2">
                  <Award className="w-4 h-4" />
                  Teachers ({teachers.length})
                </TabsTrigger>
                <TabsTrigger value="students" className="gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Students ({students.length})
                </TabsTrigger>
              </TabsList>

              {/* Teachers Tab */}
              <TabsContent value="teachers">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-500" />
                      Teacher Recommendations
                    </CardTitle>
                    <Button onClick={() => openTeacherDialog()} size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Teacher
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingTeachers ? (
                      <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : teachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No teacher testimonials yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {teachers.map((t) => (
                          <div key={t.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold shrink-0">
                              {t.photo_url ? (
                                <img src={t.photo_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                t.name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">{t.name}</span>
                                {t.title && <span className="text-sm text-muted-foreground">• {t.title}</span>}
                                {!t.is_active && <Badge variant="secondary">Hidden</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{t.message}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                checked={t.is_active}
                                onCheckedChange={(checked) => toggleTeacherActiveMutation.mutate({ id: t.id, is_active: checked })}
                              />
                              <Button variant="ghost" size="icon" onClick={() => openTeacherDialog(t)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Delete this testimonial?')) {
                                    deleteTeacherMutation.mutate(t.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Students Tab */}
              <TabsContent value="students">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      Student Reviews
                    </CardTitle>
                    <Button onClick={() => openStudentDialog()} size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Student
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingStudents ? (
                      <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No student testimonials yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {students.map((s) => (
                          <div key={s.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-foreground">{s.name}</span>
                                <Badge variant="outline">{s.grade}</Badge>
                                {s.stream && <Badge variant="secondary">{s.stream}</Badge>}
                                <span className="text-xs text-muted-foreground">{s.year}</span>
                                {!s.is_active && <Badge variant="secondary">Hidden</Badge>}
                              </div>
                              <div className="flex gap-0.5 mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < s.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} />
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{s.message}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                checked={s.is_active}
                                onCheckedChange={(checked) => toggleStudentActiveMutation.mutate({ id: s.id, is_active: checked })}
                              />
                              <Button variant="ghost" size="icon" onClick={() => openStudentDialog(s)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Delete this testimonial?')) {
                                    deleteStudentMutation.mutate(s.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Teacher Dialog */}
          <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
                <DialogDescription>Teacher recommendations appear in the top row of the testimonials section.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} placeholder="Dr. Kamal Perera" />
                </div>
                <div className="space-y-2">
                  <Label>Title / Subject</Label>
                  <Input value={teacherForm.title} onChange={(e) => setTeacherForm({ ...teacherForm, title: e.target.value })} placeholder="Senior Physics Lecturer" />
                </div>
                <div className="space-y-2">
                  <Label>Photo URL (optional)</Label>
                  <Input value={teacherForm.photo_url} onChange={(e) => setTeacherForm({ ...teacherForm, photo_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea value={teacherForm.message} onChange={(e) => setTeacherForm({ ...teacherForm, message: e.target.value })} placeholder="Their recommendation..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={teacherForm.sort_order} onChange={(e) => setTeacherForm({ ...teacherForm, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTeacherDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => saveTeacherMutation.mutate({ ...teacherForm, id: editingTeacher?.id })} disabled={!teacherForm.name || !teacherForm.message || saveTeacherMutation.isPending}>
                  {saveTeacherMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Student Dialog */}
          <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
                <DialogDescription>Student reviews appear in the bottom row with star ratings.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Kavindi Perera" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade *</Label>
                    <Select value={studentForm.grade} onValueChange={(v) => setStudentForm({ ...studentForm, grade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A/L">A/L</SelectItem>
                        <SelectItem value="O/L">O/L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Input value={studentForm.year} onChange={(e) => setStudentForm({ ...studentForm, year: e.target.value })} placeholder="2024" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Stream (for A/L)</Label>
                  <Select value={studentForm.stream} onValueChange={(v) => setStudentForm({ ...studentForm, stream: v })}>
                    <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Maths">Maths</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rating *</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} type="button" onClick={() => setStudentForm({ ...studentForm, rating: r })}>
                        <Star className={`w-6 h-6 transition-colors ${r <= studentForm.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted hover:fill-amber-200 hover:text-amber-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea value={studentForm.message} onChange={(e) => setStudentForm({ ...studentForm, message: e.target.value })} placeholder="Their review..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={studentForm.sort_order} onChange={(e) => setStudentForm({ ...studentForm, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => saveStudentMutation.mutate({ ...studentForm, id: editingStudent?.id })} disabled={!studentForm.name || !studentForm.message || saveStudentMutation.isPending}>
                  {saveStudentMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default TestimonialsSettings;