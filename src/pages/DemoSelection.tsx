import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  ChevronRight, 
  Sparkles,
  Users,
  CheckCircle2,
  GraduationCap,
  Languages
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/hooks/useBranding';
import { useGradeLevels } from '@/hooks/useGradeLevels';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { StreamType, GradeLevel, MediumType } from '@/types/database';
import { STREAM_LABELS, GRADE_LABELS, MEDIUM_LABELS } from '@/types/database';

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
  const { isOLEnabled, isLoading: gradeLoading, availableGrades } = useGradeLevels();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection state - now with specific grade and medium
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('al_grade12');
  const [selectedStream, setSelectedStream] = useState<StreamType | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<MediumType>('english');
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

  // Check if selected grade is A/L
  const isALevel = selectedGrade.startsWith('al_');

  // Filter subjects based on all selections
  const filteredSubjects = subjects.filter(s => {
    // Grade filter
    if (s.grade !== selectedGrade) return false;
    
    // Medium filter  
    if (s.medium !== selectedMedium) return false;
    
    // For A/L, filter by stream
    if (isALevel && selectedStream) {
      const subjectStreams = s.streams || [s.stream];
      return subjectStreams.includes(selectedStream);
    }
    
    return true;
  });

  // Get available streams for A/L
  const availableStreams: StreamType[] = ['maths', 'biology', 'commerce', 'arts', 'technology'];

  // Get A/L grades only
  const alGrades = availableGrades.filter(g => g.startsWith('al_')) as GradeLevel[];

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      }
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
    
    const params = new URLSearchParams({
      grade: selectedGrade,
      stream: selectedStream || '',
      medium: selectedMedium,
      subjects: selectedSubjects.join(',')
    });
    navigate(`/demo/dashboard?${params.toString()}`);
  };

  // Determine current step number based on selections
  const getStepNumber = (step: 'grade' | 'stream' | 'medium' | 'subjects') => {
    if (!isOLEnabled) {
      // A/L only mode: Grade -> Stream -> Medium -> Subjects (1-4)
      const steps = ['grade', 'stream', 'medium', 'subjects'];
      return steps.indexOf(step) + 1;
    } else {
      // Both modes: Grade -> Stream (if A/L) -> Medium -> Subjects
      if (step === 'grade') return 1;
      if (step === 'stream') return 2;
      if (step === 'medium') return isALevel ? 3 : 2;
      if (step === 'subjects') return isALevel ? 4 : 3;
    }
    return 1;
  };

  if (gradeLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-brand mx-auto animate-pulse mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

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
            Select your grade, stream, medium, and subjects to explore our dashboard and learning materials. 
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
          {/* Step 1: Grade */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                {getStepNumber('grade')}
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand" />
                <h2 className="font-semibold text-foreground text-lg">Select your grade</h2>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              {alGrades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(grade);
                    setSelectedStream(null);
                    setSelectedSubjects([]);
                  }}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    selectedGrade === grade
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-secondary hover:border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {GRADE_LABELS[grade]}
                  <span className="text-xs block text-muted-foreground">
                    {grade === 'al_grade12' ? '1st Year A/L' : '2nd Year A/L'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Stream (A/L only) */}
          {isALevel && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                  {getStepNumber('stream')}
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand" />
                  <h2 className="font-semibold text-foreground text-lg">Select your stream</h2>
                </div>
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

          {/* Step 3: Medium */}
          {(isALevel ? selectedStream : true) && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                  {getStepNumber('medium')}
                </div>
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-brand" />
                  <h2 className="font-semibold text-foreground text-lg">Select your medium</h2>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                {(Object.entries(MEDIUM_LABELS) as [MediumType, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSelectedMedium(value);
                      setSelectedSubjects([]);
                    }}
                    className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                      selectedMedium === value
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-secondary hover:border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Subjects */}
          {(isALevel ? selectedStream : true) && selectedMedium && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                  {getStepNumber('subjects')}
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
