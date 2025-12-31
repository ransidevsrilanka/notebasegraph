import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  BookOpen, 
  FolderOpen,
  FileText,
  Eye,
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { TIER_LABELS } from '@/types/database';
import type { Subject, Topic, Note, TierType } from '@/types/database';
import { toast } from 'sonner';
import { usePDFViewer } from '@/hooks/usePDFViewer';
import { PDFViewer, PDFAccessDenied } from '@/components/PDFViewer';

const TIER_ORDER: TierType[] = ['starter', 'standard', 'lifetime'];

const SubjectPage = () => {
  const { subjectId } = useParams();
  const { enrollment } = useAuth();
  const navigate = useNavigate();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);

  const pdfViewer = usePDFViewer();
  const userTierIndex = enrollment ? TIER_ORDER.indexOf(enrollment.tier) : -1;

  useEffect(() => {
    if (!subjectId) {
      navigate('/dashboard');
      return;
    }

    const fetchSubject = async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      setSubject(data as Subject);
    };

    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_active', true)
        .order('sort_order');

      if (!error && data) {
        setTopics(data as Topic[]);
      }
      setIsLoading(false);
    };

    fetchSubject();
    fetchTopics();
  }, [subjectId, navigate]);

  const fetchNotes = async (topicId: string) => {
    if (notes[topicId]) return;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(prev => ({ ...prev, [topicId]: data as Note[] }));
    }
  };

  const toggleTopic = (topicId: string) => {
    if (expandedTopic === topicId) {
      setExpandedTopic(null);
    } else {
      setExpandedTopic(topicId);
      fetchNotes(topicId);
    }
  };

  const canAccessNote = (noteTier: TierType) => {
    const noteTierIndex = TIER_ORDER.indexOf(noteTier);
    return userTierIndex >= noteTierIndex;
  };

  const handleViewNote = async (note: Note) => {
    if (!canAccessNote(note.min_tier)) {
      toast.error(`This note requires ${TIER_LABELS[note.min_tier]} tier or higher`);
      return;
    }

    setShowViewer(true);
    const success = await pdfViewer.loadPDF(note.id);
    if (!success && !pdfViewer.error) {
      toast.error('Failed to load document');
    }
  };

  const handleCloseViewer = () => {
    pdfViewer.saveProgress();
    pdfViewer.clearPDF();
    setShowViewer(false);
  };

  if (isLoading || !subject) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4">
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-24 pb-12 bg-vault-surface">
        <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            
            {enrollment && enrollment.tier !== 'lifetime' && (
              <Link 
                to="/upgrade" 
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-primary transition-colors px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:border-primary/50"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade Plan
              </Link>
            )}
          </div>
            
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {subject.name}
              </h1>
              {subject.description && (
                <p className="text-muted-foreground">{subject.description}</p>
              )}
            </div>
          </div>
        </div>

          {topics.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FolderOpen className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No Topics Yet
              </h3>
              <p className="text-muted-foreground">
                Topics for this subject are being prepared. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="glass-card overflow-hidden">
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-semibold text-foreground">
                          {topic.name}
                        </h3>
                        {topic.description && (
                          <p className="text-muted-foreground text-sm">{topic.description}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight 
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedTopic === topic.id ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>

                  {expandedTopic === topic.id && (
                    <div className="border-t border-border">
                      {!notes[topic.id] ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Loading notes...
                        </div>
                      ) : notes[topic.id].length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No notes available yet
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {notes[topic.id].map((note) => {
                            const hasAccess = canAccessNote(note.min_tier);
                            
                            return (
                              <div 
                                key={note.id} 
                                className={`p-4 flex items-center justify-between ${
                                  hasAccess ? 'hover:bg-secondary/20' : 'opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    hasAccess ? 'bg-primary/10' : 'bg-muted'
                                  }`}>
                                    {hasAccess ? (
                                      <FileText className="w-4 h-4 text-primary" />
                                    ) : (
                                      <Lock className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-foreground font-medium text-sm">
                                      {note.title}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      {TIER_LABELS[note.min_tier]} tier
                                      {note.file_size && ` • ${(note.file_size / 1024 / 1024).toFixed(2)} MB`}
                                    </p>
                                  </div>
                                </div>
                                
                                {hasAccess ? (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleViewNote(note)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                                    Locked
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PDF Viewer Modal */}
      {showViewer && pdfViewer.pdfUrl && (
        <PDFViewer
          url={pdfViewer.pdfUrl}
          watermark={pdfViewer.watermark}
          noteTitle={pdfViewer.noteTitle}
          currentPage={pdfViewer.currentPage}
          scale={pdfViewer.scale}
          onPageChange={pdfViewer.setCurrentPage}
          onTotalPagesChange={pdfViewer.setTotalPages}
          onScaleChange={pdfViewer.setScale}
          onClose={handleCloseViewer}
        />
      )}

      {/* Access Denied Modal */}
      {showViewer && pdfViewer.error && pdfViewer.errorCode && (
        <PDFAccessDenied
          errorCode={pdfViewer.errorCode}
          onClose={handleCloseViewer}
        />
      )}

      {/* Loading State */}
      {showViewer && pdfViewer.isLoading && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      )}
    </main>
  );
};

export default SubjectPage;
