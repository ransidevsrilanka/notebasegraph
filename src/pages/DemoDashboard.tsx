import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ChevronRight, 
  Sparkles,
  Users,
  GraduationCap,
  Lock,
  FileText,
  BarChart3,
  Target,
  Clock,
  Award
} from 'lucide-react';
import DemoTour from '@/components/demo/DemoTour';
import LockedContent from '@/components/demo/LockedContent';
import type { StreamType } from '@/types/database';
import { STREAM_LABELS } from '@/types/database';

interface Subject {
  id: string;
  name: string;
  stream: StreamType;
  streams: StreamType[];
  grade: string;
  medium: string;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  subject_id: string;
}

const DemoDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(true);

  // Get selections from URL
  const selectedSubjectIds = searchParams.get('subjects')?.split(',') || [];
  const selectedStream = searchParams.get('stream') as StreamType | null;
  const selectedGrade = searchParams.get('grade') || 'al';

  useEffect(() => {
    if (selectedSubjectIds.length === 0) {
      navigate('/demo');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch selected subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, stream, streams, grade, medium')
      .in('id', selectedSubjectIds);

    if (subjectsData) {
      setSubjects(subjectsData as Subject[]);
      
      // Fetch topics for all selected subjects
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id, name, description, subject_id')
        .in('subject_id', selectedSubjectIds)
        .eq('is_active', true)
        .order('sort_order');

      if (topicsData) {
        const topicsBySubject: Record<string, Topic[]> = {};
        topicsData.forEach((topic: any) => {
          if (!topicsBySubject[topic.subject_id]) {
            topicsBySubject[topic.subject_id] = [];
          }
          topicsBySubject[topic.subject_id].push(topic);
        });
        setTopics(topicsBySubject);
      }
    }

    setIsLoading(false);
  };

  // Mock stats for demo
  const mockStats = {
    totalNotes: 156,
    topicsCompleted: 0,
    studyStreak: 0,
    hoursStudied: 0
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Tour Overlay */}
      {showTour && <DemoTour onComplete={() => setShowTour(false)} />}

      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-brand" />
              <span className="font-display text-xl font-bold text-foreground">
                Zen Notes
              </span>
              <Badge className="bg-yellow-500/20 text-yellow-600 border-0">Demo Mode</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/demo')}>
                Change Subjects
              </Button>
              <Button variant="brand" onClick={() => navigate('/paid-signup')} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Sign Up Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="glass-card p-6 mb-8 bg-gradient-to-r from-brand/5 to-brand/10 border-brand/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                Welcome to Your Demo Dashboard
              </h1>
              <p className="text-muted-foreground">
                Explore subjects and topics. Sign up to unlock notes and premium features.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand">1,200+</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand">{mockStats.totalNotes}</p>
                <p className="text-xs text-muted-foreground">Notes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-brand" />
            </div>
            <p className="text-2xl font-bold text-foreground">{subjects.length}</p>
            <p className="text-sm text-muted-foreground">Subjects</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{mockStats.topicsCompleted}</p>
            <p className="text-sm text-muted-foreground">Topics Completed</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{mockStats.studyStreak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{mockStats.hoursStudied}</p>
            <p className="text-sm text-muted-foreground">Hours Studied</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subjects & Topics */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="font-display text-xl font-bold text-foreground">Your Subjects</h2>
            
            {isLoading ? (
              <div className="glass-card p-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className="glass-card overflow-hidden">
                    <button
                      onClick={() => setSelectedSubject(selectedSubject?.id === subject.id ? null : subject)}
                      className="w-full p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-brand" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-foreground">{subject.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {STREAM_LABELS[subject.stream]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(topics[subject.id] || []).length} topics
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${
                        selectedSubject?.id === subject.id ? 'rotate-90' : ''
                      }`} />
                    </button>

                    {/* Topics */}
                    {selectedSubject?.id === subject.id && (
                      <div className="border-t border-border">
                        {(topics[subject.id] || []).length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground">
                            No topics available yet
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {(topics[subject.id] || []).map((topic) => (
                              <div key={topic.id} className="p-4 hover:bg-secondary/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-foreground">{topic.name}</p>
                                      {topic.description && (
                                        <p className="text-xs text-muted-foreground">{topic.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Locked</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CTA Card */}
            <div className="glass-card p-6 bg-gradient-to-br from-brand/10 to-brand/5 border-brand/20">
              <Sparkles className="w-8 h-8 text-brand mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                Unlock Full Access
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get unlimited access to all notes, quizzes, flashcards, and premium features.
              </p>
              <Button variant="brand" className="w-full" onClick={() => navigate('/paid-signup')}>
                Sign Up Now
              </Button>
            </div>

            {/* Locked Features Preview */}
            <LockedContent 
              title="Study Notes"
              description="Access comprehensive notes prepared by top educators"
            />

            <LockedContent 
              title="Practice Quizzes"
              description="Test your knowledge with MCQs and get instant feedback"
            />

            <LockedContent 
              title="Flashcards"
              description="Master key concepts with spaced repetition"
            />
          </div>
        </div>
      </div>

      {/* Floating CTA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <Button 
          variant="brand" 
          size="lg"
          onClick={() => navigate('/paid-signup')}
          className="shadow-2xl shadow-brand/30 gap-2 px-8"
        >
          <Sparkles className="w-5 h-5" />
          Sign Up & Unlock Everything
        </Button>
      </div>
    </main>
  );
};

export default DemoDashboard;
