import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ChevronRight, 
  Sparkles,
  Users,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/hooks/useBranding';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { StreamType, GradeGroup } from '@/types/database';
import { STREAM_LABELS, GRADE_GROUPS } from '@/types/database';

interface Subject {
  id: string;
  name: string;
  stream: StreamType;
  streams: StreamType[];
  grade: string;
  medium: string;
}

const DemoSelection = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection state
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<GradeGroup>('al');
  const [selectedStream, setSelectedStream] = useState<StreamType | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, stream, streams, grade, medium')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setSubjects(data as Subject[]);
    }
    setIsLoading(false);
  };

  // Filter subjects based on selection
  const filteredSubjects = subjects.filter(s => {
    const gradeMatches = selectedGradeGroup === 'al' 
      ? s.grade?.startsWith('al_') 
      : s.grade?.startsWith('ol_');
    
    if (!gradeMatches) return false;
    
    // For A/L, filter by stream
    if (selectedGradeGroup === 'al' && selectedStream) {
      const subjectStreams = s.streams || [s.stream];
      return subjectStreams.includes(selectedStream);
    }
    
    return true;
  });

  // Get available streams for current grade group
  const availableStreams: StreamType[] = ['maths', 'biology', 'commerce', 'arts', 'technology'];

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      }
      // Limit to 3 subjects for demo
      if (prev.length >= 3) {
        toast.info('You can select up to 3 subjects for the demo');
        return prev;
      }
      return [...prev, subjectId];
    });
  };

  const handleStartDemo = () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    
    // Navigate to demo dashboard with selections
    const params = new URLSearchParams({
      grade: selectedGradeGroup,
      stream: selectedStream || '',
      subjects: selectedSubjects.join(',')
    });
    navigate(`/demo/dashboard?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 pt-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 rounded-full text-brand text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Experience the platform before you commit
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Try {branding.siteName} for Free
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select your subjects and explore our dashboard, topics, and learning materials. 
            No sign-up required.
          </p>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 text-brand" />
              <span className="font-semibold text-foreground">1,200+</span> students enrolled
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-5 h-5 text-brand" />
              <span className="font-semibold text-foreground">500+</span> study notes
            </div>
          </div>
        </div>

        {/* Selection Steps */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Grade Level */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <h2 className="font-semibold text-foreground text-lg">Choose your level</h2>
            </div>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(GRADE_GROUPS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedGradeGroup(key as GradeGroup);
                    setSelectedStream(null);
                    setSelectedSubjects([]);
                  }}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    selectedGradeGroup === key
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-secondary hover:border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Stream (A/L only) */}
          {selectedGradeGroup === 'al' && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <h2 className="font-semibold text-foreground text-lg">Select your stream</h2>
              </div>
              <div className="flex gap-3 flex-wrap">
                {availableStreams.map((stream) => (
                  <button
                    key={stream}
                    onClick={() => {
                      setSelectedStream(stream);
                      setSelectedSubjects([]);
                    }}
                    className={`px-5 py-2.5 rounded-lg border-2 font-medium transition-all ${
                      selectedStream === stream
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-secondary hover:border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {STREAM_LABELS[stream]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Subjects */}
          {(selectedGradeGroup === 'ol' || selectedStream) && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                  {selectedGradeGroup === 'al' ? '3' : '2'}
                </div>
                <h2 className="font-semibold text-foreground text-lg">
                  Pick up to 3 subjects to explore
                </h2>
              </div>
              
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading subjects...</div>
              ) : filteredSubjects.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No subjects available for this selection yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredSubjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        onClick={() => handleSubjectToggle(subject.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all relative ${
                          isSelected
                            ? 'border-brand bg-brand/10'
                            : 'border-border bg-secondary hover:border-muted-foreground'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-brand" />
                        )}
                        <BookOpen className={`w-5 h-5 mb-2 ${isSelected ? 'text-brand' : 'text-muted-foreground'}`} />
                        <p className={`font-medium text-sm ${isSelected ? 'text-brand' : 'text-foreground'}`}>
                          {subject.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {subject.medium === 'sinhala' ? 'සිංහල' : 'English'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Start Demo Button */}
          {selectedSubjects.length > 0 && (
            <div className="text-center">
              <Button 
                size="lg" 
                variant="brand" 
                onClick={handleStartDemo}
                className="px-12 py-6 text-lg gap-2"
              >
                Start Demo
                <ChevronRight className="w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                You're just one step away from exploring {branding.siteName}!
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  );
};

export default DemoSelection;
