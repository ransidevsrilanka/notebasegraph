import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  ArrowRight, 
  ChevronLeft,
  ChevronRight,
  BookMarked,
  DollarSign,
  Clock,
  Brain,
  Target,
  Bot,
  CheckCircle2,
  Languages,
  UserX,
  Sparkles,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';

type Language = 'en' | 'si';

const translations = {
  en: {
    trauma: {
      title: "It's 2 AM.",
      lines: [
        "Your exam is in 12 hours.",
        "The notes don't make sense.",
        "You're not ready.",
      ],
    },
    statistic: {
      number: 62,
      prefix: "of A/L students felt",
      highlight: '"completely unprepared"',
      suffix: "the night before their exam.",
      hope: "You don't have to be one of them.",
    },
    pain: {
      title: "Sound familiar?",
      cards: [
        { icon: BookMarked, title: "Scattered Notes", desc: "Notes from different sources that don't connect" },
        { icon: DollarSign, title: "Expensive Tuition", desc: "Monthly fees of LKR 50,000+ your family can't afford" },
        { icon: Clock, title: "No Time", desc: "Work, home duties, and still find time to study" },
        { icon: Brain, title: "Exam Stress", desc: "Panic attacks, sleepless nights, tears before exams" },
        { icon: Target, title: "No Direction", desc: "Don't know what to study or how to prioritize" },
      ],
    },
    solution: {
      intro: "That's why we built",
      tagline: "One platform. All your notes.",
      benefits: [
        "Curated notes by top teachers",
        "24/7 AI Tutor for instant help",
        "Starting at just LKR 1,990",
      ],
      aiHighlight: "Ask anything, anytime",
    },
    cta: {
      headline: "Don't let exam night terror be your reality.",
      button: "Try Demo Free",
      subtext: "No account needed. See exactly what you get.",
      badges: ["No signup", "Free", "Real notes"],
    },
    nav: {
      next: "Next",
      back: "Back",
    },
    langToggle: "සිංහල",
  },
  si: {
    trauma: {
      title: "රාත්‍රී 2 යි.",
      lines: [
        "පරීක්ෂණය පැය 12 කින්.",
        "සටහන් තේරෙන්නේ නැහැ.",
        "ඔබ සූදානම් නැහැ.",
      ],
    },
    statistic: {
      number: 62,
      prefix: "උසස් පෙළ සිසුන්ගෙන්",
      highlight: '"සම්පූර්ණයෙන්ම සූදානම් නොවූ"',
      suffix: "බව පරීක්ෂණයට පෙර රාත්‍රියේ.",
      hope: "ඔබ ඔවුන්ගෙන් කෙනෙක් විය යුතු නැහැ.",
    },
    pain: {
      title: "ඔබටත් මෙහෙම වුණා ද?",
      cards: [
        { icon: BookMarked, title: "විසිරුණු සටහන්", desc: "විවිධ මූලාශ්‍රවලින් සටහන් එකිනෙකට සම්බන්ධ නැහැ" },
        { icon: DollarSign, title: "මිල අධික ටියුෂන්", desc: "මාසික ගාස්තු රු. 50,000+ දරාගන්න අමාරුයි" },
        { icon: Clock, title: "කාලය නැහැ", desc: "වැඩ, ගෙදර වැඩ, ඒත් ඉගෙන ගන්නත් ඕන" },
        { icon: Brain, title: "විභාග ආතතිය", desc: "කලබලය, නින්ද නැති රාත්‍රි, විභාගවලට කලින් අඬනවා" },
        { icon: Target, title: "මඟ පෙන්වීමක් නැහැ", desc: "මොනවා කියවන්නද, prioritize කරන්නේ කොහොමද දන්නේ නැහැ" },
      ],
    },
    solution: {
      intro: "ඒ නිසයි අපි නිර්මාණය කළේ",
      tagline: "එක් වේදිකාවක්. ඔබේ සියලු සටහන්.",
      benefits: [
        "පළපුරුදු ගුරුවරුන්ගේ සටහන්",
        "24/7 AI Tutor ක්ෂණික උදව් සඳහා",
        "ආරම්භක මිල රු. 1,990 පමණයි",
      ],
      aiHighlight: "ඕනෑම දෙයක් අහන්න, ඕනෑම වේලාවක",
    },
    cta: {
      headline: "විභාග රාත්‍රියේ බිය ඔබේ යථාර්ථය වීමට ඉඩ නොදෙන්න.",
      button: "Demo එක බලන්න",
      subtext: "Account එකක් අවශ්‍ය නැහැ. ලැබෙන දේ හරියටම බලන්න.",
      badges: ["Signup නැහැ", "Free", "සැබෑ notes"],
    },
    nav: {
      next: "ඊළඟ",
      back: "ආපසු",
    },
    langToggle: "English",
  },
};

// Animated counter component
const AnimatedCounter = ({ target, isActive }: { target: number; isActive: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCount(0);
      return;
    }

    let current = 0;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    const interval = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [target, isActive]);

  return (
    <span className="font-display text-7xl md:text-9xl font-bold text-brand tabular-nums">
      {count}%
    </span>
  );
};

// Step 1: Trauma Hook
const TraumaStep = ({ t, isActive }: { t: typeof translations.en; isActive: boolean }) => {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setVisibleLines(0);
      return;
    }

    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= t.trauma.lines.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isActive, t.trauma.lines.length]);

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 pt-16">
      <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-10 tracking-tight step-fade-in">
        {t.trauma.title}
      </h1>

      <div className="space-y-4 min-h-[140px] md:min-h-[160px]">
        {t.trauma.lines.slice(0, visibleLines).map((line, index) => (
          <p
            key={index}
            className={cn(
              "text-xl md:text-2xl font-light step-fade-in",
              index === visibleLines - 1 ? "text-foreground" : "text-muted-foreground"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {line}
          </p>
        ))}
        {visibleLines < t.trauma.lines.length && (
          <span className="inline-block w-0.5 h-6 bg-brand animate-pulse" />
        )}
      </div>
    </div>
  );
};

// Step 2: Statistic
const StatisticStep = ({ t, isActive }: { t: typeof translations.en; isActive: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 pt-8">
      <div className="glass-card p-8 md:p-12 border-brand/20 bg-brand/5 step-fade-in max-w-lg">
        <AnimatedCounter target={t.statistic.number} isActive={isActive} />
        
        <p className="text-lg md:text-xl text-muted-foreground mt-6">
          {t.statistic.prefix}{' '}
          <span className="text-red-400 font-semibold">{t.statistic.highlight}</span>{' '}
          {t.statistic.suffix}
        </p>
      </div>

      <p className="text-xl md:text-2xl font-medium text-foreground mt-10 step-fade-in" style={{ animationDelay: '0.5s' }}>
        {t.statistic.hope}
      </p>
    </div>
  );
};

// Step 3: Pain Points
const PainPointsStep = ({ t }: { t: typeof translations.en }) => {
  return (
    <div className="flex flex-col items-center px-4 pt-8 overflow-hidden">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-6 step-fade-in">
        {t.pain.title}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
        {t.pain.cards.slice(0, 3).map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className="glass-card p-4 border-red-500/20 hover:border-red-500/40 transition-all step-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
                <IconComponent className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md w-full mt-3">
        {t.pain.cards.slice(3, 5).map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index + 3}
              className="glass-card p-4 border-red-500/20 hover:border-red-500/40 transition-all step-fade-in"
              style={{ animationDelay: `${(index + 3) * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
                <IconComponent className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{card.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Step 4: Solution
const SolutionStep = ({ t, branding }: { t: typeof translations.en; branding: { logoImage?: string; siteName: string } }) => {
  return (
    <div className="flex flex-col items-center px-6 pt-8">
      <p className="text-lg text-muted-foreground mb-4 step-fade-in">
        {t.solution.intro}
      </p>

      <div className="flex items-center gap-3 mb-6 step-fade-in" style={{ animationDelay: '0.1s' }}>
        {branding.logoImage ? (
          <img src={branding.logoImage} alt={branding.siteName} className="h-12 w-auto" />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-brand" />
          </div>
        )}
        <h2 className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
          {branding.siteName}
        </h2>
      </div>

      <p className="text-lg font-medium text-foreground mb-6 text-center step-fade-in" style={{ animationDelay: '0.2s' }}>
        {t.solution.tagline}
      </p>

      <div className="glass-card p-6 max-w-sm w-full border-brand/30 bg-gradient-to-br from-brand/5 to-transparent step-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="space-y-3">
          {t.solution.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
              <span className="text-foreground text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">24/7 AI Tutor</p>
            <p className="text-xs text-muted-foreground">{t.solution.aiHighlight}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 5: CTA
const CTAStep = ({ t, onTryDemo }: { t: typeof translations.en; onTryDemo: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-12 text-center">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-10 max-w-md step-fade-in">
        {t.cta.headline}
      </h2>

      <Button
        size="lg"
        variant="brand"
        onClick={onTryDemo}
        className="gap-2 px-10 py-6 text-lg shimmer-button step-fade-in"
        style={{ animationDelay: '0.2s' }}
      >
        <Sparkles className="w-5 h-5" />
        {t.cta.button}
        <ArrowRight className="w-5 h-5" />
      </Button>

      <p className="text-muted-foreground mt-4 text-sm step-fade-in" style={{ animationDelay: '0.3s' }}>
        {t.cta.subtext}
      </p>

      <div className="flex items-center gap-4 mt-10 step-fade-in" style={{ animationDelay: '0.4s' }}>
        {t.cta.badges.map((badge, index) => (
          <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>{badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Navigation component
const StepNavigation = ({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onGoToStep,
  t,
}: {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  t: typeof translations.en;
}) => {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-background via-background/95 to-transparent">
      {/* Step dots */}
      <div className="flex justify-center gap-2 mb-5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoToStep(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentStep
                ? "bg-brand w-8"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
            )}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      {/* Nav buttons */}
      <div className="flex gap-3 max-w-xs mx-auto px-6">
        {!isFirst && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex-1 h-12"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t.nav.back}
          </Button>
        )}
        {!isLast && (
          <Button
            variant="brand"
            onClick={onNext}
            className={cn("h-12", isFirst ? "flex-1" : "flex-1")}
          >
            {t.nav.next}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

const GetStarted = () => {
  const navigate = useNavigate();
  const { branding, isLoading: brandingLoading } = useBranding();
  const [lang, setLang] = useState<Language>('en');
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5;

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'si')) {
      setLang(savedLang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = lang === 'en' ? 'si' : 'en';
    setLang(newLang);
    localStorage.setItem('preferred_language', newLang);
  }, [lang]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleGoToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleTryDemo = useCallback(() => {
    navigate('/demo');
  }, [navigate]);

  const t = translations[lang];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <TraumaStep t={t} isActive={currentStep === 0} />;
      case 1:
        return <StatisticStep t={t} isActive={currentStep === 1} />;
      case 2:
        return <PainPointsStep t={t} />;
      case 3:
        return <SolutionStep t={t} branding={branding} />;
      case 4:
        return <CTAStep t={t} onTryDemo={handleTryDemo} />;
      default:
        return null;
    }
  };

  return (
    <main className="h-dvh overflow-hidden bg-background relative">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Trauma step - red undertones */}
        <div
          className={cn(
            "absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full blur-[150px] transition-opacity duration-1000",
            currentStep === 0 ? "opacity-100 bg-red-500/8" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "absolute bottom-[30%] right-[5%] w-[300px] h-[300px] rounded-full blur-[120px] transition-opacity duration-1000",
            currentStep === 0 ? "opacity-100 bg-orange-500/5" : "opacity-0"
          )}
        />
        
        {/* Solution/CTA steps - brand glow */}
        <div
          className={cn(
            "absolute top-[15%] right-[15%] w-[400px] h-[400px] rounded-full blur-[150px] transition-opacity duration-1000",
            currentStep >= 3 ? "opacity-100 bg-brand/10" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "absolute bottom-[20%] left-[10%] w-[350px] h-[350px] rounded-full blur-[120px] transition-opacity duration-1000",
            currentStep >= 3 ? "opacity-100 bg-green-500/5" : "opacity-0"
          )}
        />
      </div>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full glass-card hover:border-brand/30 transition-all"
      >
        <Languages className="w-4 h-4 text-brand" />
        <span className={cn(
          "text-sm font-medium text-foreground",
          lang === 'si' && "font-sinhala"
        )}>
          {t.langToggle}
        </span>
      </button>

      {/* Step Content */}
      <div 
        key={currentStep}
        className="h-full flex flex-col items-center justify-center pb-32 step-container"
      >
        {renderStep()}
      </div>

      {/* Navigation */}
      <StepNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={handleNext}
        onBack={handleBack}
        onGoToStep={handleGoToStep}
        t={t}
      />
    </main>
  );
};

export default GetStarted;
