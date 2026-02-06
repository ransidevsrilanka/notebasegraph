import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  BookOpen,
  Sparkles,
  GraduationCap,
  Bot
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface DemoTourProps {
  onComplete: () => void;
}

const DemoTour = ({ onComplete }: DemoTourProps) => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: `Welcome to ${branding.siteName}!`,
      description: 'Your personalized dashboard for accessing study materials, notes, and exam preparation resources.',
      icon: <GraduationCap className="w-6 h-6" />,
    },
    {
      id: 'subjects',
      title: 'Your Subjects',
      description: 'Browse all your selected subjects. Click on any subject to explore topics and study notes.',
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      id: 'ai-tutor',
      title: '24/7 AI Tutor',
      description: 'Get instant help with any topic. Our AI tutor is available around the clock to answer your questions.',
      icon: <Bot className="w-6 h-6" />,
    },
    {
      id: 'cta',
      title: 'Ready to Get Started?',
      description: 'Sign up now to unlock all features, access premium notes, and join thousands of successful students!',
      icon: <Sparkles className="w-6 h-6" />,
    }
  ];

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };


  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" 
        onClick={handleComplete}
      />
      
      {/* Tour Card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="glass-card p-8 max-w-md mx-4 relative pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
          {/* Close button */}
          <button 
            onClick={handleComplete}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-6">
            {tourSteps.map((_, index) => (
              <div 
                key={index}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  index === currentStep ? 'bg-brand' : 
                  index < currentStep ? 'bg-brand/50' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center text-brand mb-4">
            {step.icon}
          </div>

          {/* Content */}
          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            {step.title}
          </h2>
          <p className="text-muted-foreground mb-6">
            {step.description}
          </p>

          {/* Actions - Fixed overflow */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <div className="flex-1 min-w-0" />
            {isLastStep ? (
              <Button variant="brand" size="sm" onClick={handleComplete} className="gap-1">
                <Sparkles className="w-4 h-4" />
                Explore Now
              </Button>
            ) : (
              <Button variant="brand" size="sm" onClick={handleNext} className="gap-1">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoTour;
