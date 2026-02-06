import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ChevronRight, 
  Sparkles,
  Crown,
  Lock,
  FileText,
  Clock,
  Shield,
  ArrowUpRight,
  Share2,
  Languages,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import DemoTour from '@/components/demo/DemoTour';
import type { StreamType } from '@/types/database';
import { STREAM_LABELS, TIER_LABELS, GRADE_LABELS, MEDIUM_LABELS } from '@/types/database';

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

interface Note {
  id: string;
  title: string;
  description: string | null;
  min_tier: string | null;
  topic_id: string;
  page_count: number | null;
}

const DemoDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding, isLoading: brandingLoading } = useBranding();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(true);

  // Get selections from URL
  const selectedSubjectIds = searchParams.get('subjects')?.split(',') || [];
  const selectedStream = searchParams.get('stream') as StreamType | null;
  const selectedGrade = searchParams.get('grade') || 'al';
  const selectedMedium = 'english';

  // Simulated enrollment for demo - starter tier
  const simulatedEnrollment = {
    tier: 'starter' as const,
    grade: selectedGrade === 'al' ? 'al_year_1' : 'ol_grade_10',
    stream: selectedStream || 'maths',
    medium: selectedMedium,
  };

  // Tier order for access checking
  const tierOrder = ['starter', 'standard', 'lifetime'];
  
  // In demo mode, ALL notes are locked to encourage signup
  const isNoteLocked = (_noteMinTier: string | null) => {
    return true;
  };

  const getTierBadge = (tier: string | null) => {
    if (!tier || tier === 'starter') return null;
    if (tier === 'standard') return { label: 'Gold', color: 'bg-brand/20 text-brand border-brand/30' };
    if (tier === 'lifetime') return { label: 'Platinum', color: 'bg-gold/20 text-gold border-gold/30' };
    return null;
  };

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
        const topicIds: string[] = [];
        
        topicsData.forEach((topic: any) => {
          if (!topicsBySubject[topic.subject_id]) {
            topicsBySubject[topic.subject_id] = [];
          }
          topicsBySubject[topic.subject_id].push(topic);
          topicIds.push(topic.id);
        });
        setTopics(topicsBySubject);

        // Fetch notes for all topics
        if (topicIds.length > 0) {
          const { data: notesData } = await supabase
            .from('notes')
            .select('id, title, description, min_tier, topic_id, page_count')
            .in('topic_id', topicIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (notesData) {
            const notesByTopic: Record<string, Note[]> = {};
            notesData.forEach((note: any) => {
              if (!notesByTopic[note.topic_id]) {
                notesByTopic[note.topic_id] = [];
              }
              notesByTopic[note.topic_id].push(note);
            });
            setNotes(notesByTopic);
          }
        }
      }
    }

    setIsLoading(false);
  };

  // Calculate stats
  const totalTopics = Object.values(topics).flat().length;
  const totalNotes = Object.values(notes).flat().length;
  const lockedNotes = Object.values(notes).flat().filter(n => isNoteLocked(n.min_tier)).length;
  const accessibleNotes = totalNotes - lockedNotes;

  const tierColors = {
    starter: 'bg-secondary',
    standard: 'bg-brand/10',
    lifetime: 'bg-gold/10',
  };

  const tierTextColors = {
    starter: 'text-muted-foreground',
    standard: 'text-brand',
    lifetime: 'text-gold',
  };

  const tierBorder = {
    starter: 'border border-border',
    standard: 'border border-brand/40',
    lifetime: 'border border-gold/50',
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Tour Overlay */}
      {showTour && <DemoTour onComplete={() => setShowTour(false)} />}

      {/* Header - Mirrors real dashboard */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              {!brandingLoading && branding.logoImage ? (
                <img src={branding.logoImage} alt={branding.siteName} className="h-8 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand" />
                </div>
              )}
              <span className="font-display font-bold text-foreground text-lg">
                {branding.siteName || 'Dashboard'}
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              {/* Demo Badge */}
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                Demo Mode
              </Badge>
              
              {/* Tier Badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${tierColors[simulatedEnrollment.tier]} ${tierBorder[simulatedEnrollment.tier]}`}>
                <Crown className={`w-4 h-4 ${tierTextColors[simulatedEnrollment.tier]}`} />
                <span className={`text-sm font-medium ${tierTextColors[simulatedEnrollment.tier]}`}>
                  {TIER_LABELS[simulatedEnrollment.tier]}
                </span>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => navigate('/demo')}>
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

      <section className="pt-8 pb-8">
        <div className="container mx-auto px-4">
          {/* Welcome Header */}
          <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 py-6 mb-8">
            <div>
              <span className="text-brand text-sm font-medium uppercase tracking-wider">Demo Dashboard</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-1 tracking-tight">
                Welcome to {branding.siteName}
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore subjects and topics. Sign up to unlock all notes and premium features.
              </p>
            </div>
          </header>

          {/* Stats Row - Mirrors real dashboard */}
          <section aria-label="Account overview" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{subjects.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Subjects</p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">
                {selectedStream ? STREAM_LABELS[selectedStream] : selectedGrade === 'ol' ? 'O/L' : 'A/L'}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {selectedStream ? 'Stream' : 'Level'}
              </p>
            </div>

            <div className="glass-card p-5 border-brand/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{accessibleNotes}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Accessible Notes</p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-display font-bold text-foreground">{lockedNotes}</p>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Locked (Upgrade)</p>
            </div>
          </section>

          {/* Upgrade CTA Banner */}
          <div className="glass-card p-6 mb-8 bg-gradient-to-r from-brand/5 via-brand/10 to-purple-500/5 border-brand/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Unlock Full Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign up to access all notes, quizzes, flashcards, and AI tutor
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link to="/pricing">View Plans</Link>
                </Button>
                <Button variant="brand" asChild>
                  <Link to="/paid-signup">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Sign Up Now
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Subjects List */}
          <div className="space-y-6">
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

                    {/* Topics & Notes */}
                    {selectedSubject?.id === subject.id && (
                      <div className="border-t border-border">
                        {(topics[subject.id] || []).length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground">
                            No topics available yet
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {(topics[subject.id] || []).map((topic) => (
                              <div key={topic.id} className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <FileText className="w-5 h-5 text-brand" />
                                  <div>
                                    <p className="font-medium text-foreground">{topic.name}</p>
                                    {topic.description && (
                                      <p className="text-xs text-muted-foreground">{topic.description}</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Notes for this topic */}
                                {(notes[topic.id] || []).length > 0 && (
                                  <div className="ml-8 space-y-2">
                                    {(notes[topic.id] || []).map((note) => {
                                      const locked = isNoteLocked(note.min_tier);
                                      const tierBadge = getTierBadge(note.min_tier);
                                      
                                      return (
                                        <div 
                                          key={note.id} 
                                          className={`flex items-center justify-between p-3 rounded-lg ${
                                            locked ? 'bg-muted/30 opacity-75' : 'bg-secondary/50 hover:bg-secondary/70'
                                          } transition-colors`}
                                        >
                                          <div className="flex items-center gap-3">
                                            {locked ? (
                                              <Lock className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                              <FileText className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <div>
                                              <p className={`text-sm font-medium ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {note.title}
                                              </p>
                                              {note.page_count && (
                                                <p className="text-xs text-muted-foreground">{note.page_count} pages</p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {tierBadge && (
                                              <Badge className={`text-[10px] ${tierBadge.color}`}>
                                                {tierBadge.label}
                                              </Badge>
                                            )}
                                            {locked && (
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-xs h-7"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate('/paid-signup');
                                                }}
                                              >
                                                Unlock
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
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
        </div>
      </section>

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
