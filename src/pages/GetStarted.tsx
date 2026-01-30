import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ArrowRight, 
  Sparkles,
  BookMarked,
  DollarSign,
  Clock,
  Brain,
  Target,
  Bot,
  CheckCircle2,
  Languages,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Language = 'en' | 'si';

const translations = {
  en: {
    // Hero trauma section
    traumaTitle: "It's 2 AM.",
    traumaLines: [
      "Your exam is in 12 hours.",
      "You've been staring at the same page for 3 hours.",
      "The notes don't make sense.",
      "Your friends are already asleep.",
      "Your heart is racing.",
      "You're not ready.",
    ],
    statText: "62% of A/L students say they felt",
    statHighlight: '"completely unprepared"',
    statEnd: "the night before their exam.",
    
    // Pain points
    painTitle: "Sound familiar?",
    painCards: [
      {
        icon: BookMarked,
        title: "Scattered Notes",
        description: "Notes from different sources that don't connect. Handwritten, photocopied, missing pages.",
      },
      {
        icon: DollarSign,
        title: "Expensive Tuition",
        description: "Monthly tuition fees of LKR 50,000+ that your family struggles to afford.",
      },
      {
        icon: Clock,
        title: "No Time",
        description: "You have to work, help at home, and still find time to study properly.",
      },
      {
        icon: Brain,
        title: "Exam Stress",
        description: "Panic attacks, sleepless nights, crying before exams. Sound familiar?",
      },
      {
        icon: Target,
        title: "No Direction",
        description: "You don't know what to study first or how to prioritize topics.",
      },
    ],
    
    // Solution
    solutionIntro: "That's why we created",
    solutionTagline: "One platform. All your notes.",
    solutionSubtagline: "Organized by topic. Available 24/7.",
    benefits: [
      "Curated notes by experienced teachers",
      "24/7 AI Tutor for instant help",
      "Starting at just LKR 1,990 (one-time)",
      "That's less than ONE tuition class",
    ],
    priceCompare: "For the price of 2 kottu roti, you get access to everything you need to pass your exams.",
    
    // CTA
    ctaTitle: "Don't let exam night terror be your reality.",
    ctaButton: "Try Demo Free",
    ctaSubtext: "No account needed. See exactly what you get.",
    
    // Language toggle
    langToggle: "සිංහල",
  },
  si: {
    // Hero trauma section
    traumaTitle: "රාත්‍රී 2 යි.",
    traumaLines: [
      "පරීක්ෂණය පැය 12 කින්.",
      "ඔබ පැය 3ක් එකම පිටුවට බලාගෙන ඉන්නවා.",
      "සටහන් තේරෙන්නේ නැහැ.",
      "ඔබේ යාළුවෝ දැනටමත් නිදාගෙන.",
      "ඔබේ හදවත වේගයෙන් ගැහෙනවා.",
      "ඔබ සූදානම් නැහැ.",
    ],
    statText: "උසස් පෙළ සිසුන්ගෙන් 62%ක් පවසන්නේ",
    statHighlight: '"සම්පූර්ණයෙන්ම සූදානම් නොවූ"',
    statEnd: "බව පරීක්ෂණයට පෙර රාත්‍රියේ.",
    
    // Pain points
    painTitle: "ඔබටත් මෙහෙම වුණා ද?",
    painCards: [
      {
        icon: BookMarked,
        title: "විසිරුණු සටහන්",
        description: "විවිධ මූලාශ්‍රවලින් ලබාගත් සටහන් එකිනෙකට සම්බන්ධ නැහැ. අත්‍යාත්‍ර, ෆොටෝ කොපි, පිටු අඩු.",
      },
      {
        icon: DollarSign,
        title: "මිල අධික ටියුෂන්",
        description: "මාසික ටියුෂන් ගාස්තු රු. 50,000+ ඔබේ පවුලට දරාගන්න අමාරුයි.",
      },
      {
        icon: Clock,
        title: "කාලය නැහැ",
        description: "වැඩ කරන්න ඕන, ගෙදර උදව් කරන්න ඕන, ඒත් ඉගෙන ගන්නත් ඕන.",
      },
      {
        icon: Brain,
        title: "විභාග ආතතිය",
        description: "කලබලය, නින්ද නැති රාත්‍රි, විභාගවලට කලින් අඬනවා. ඔබටත් මෙහෙම වෙනවා ද?",
      },
      {
        icon: Target,
        title: "මඟ පෙන්වීමක් නැහැ",
        description: "මුලින්ම මොනවා කියවන්නද, topics prioritize කරන්නේ කොහොමද කියලා දන්නේ නැහැ.",
      },
    ],
    
    // Solution
    solutionIntro: "ඒ නිසයි අපි නිර්මාණය කළේ",
    solutionTagline: "එක් වේදිකාවක්. ඔබේ සියලු සටහන්.",
    solutionSubtagline: "මාතෘකාව අනුව සකස් කළා. පැය 24ම ලබාගත හැක.",
    benefits: [
      "පළපුරුදු ගුරුවරුන්ගේ සටහන්",
      "24/7 AI Tutor ක්ෂණික උදව් සඳහා",
      "ආරම්භක මිල රු. 1,990 පමණයි (එක් වතාවක්)",
      "එය එක් ටියුෂන් පන්තියකටත් වඩා අඩුයි",
    ],
    priceCompare: "කොත්තු 2ක මිලට, ඔබේ විභාග සමත් වීමට අවශ්‍ය සියල්ල ලබාගන්න.",
    
    // CTA
    ctaTitle: "විභාග රාත්‍රියේ බිය ඔබේ යථාර්ථය වීමට ඉඩ නොදෙන්න.",
    ctaButton: "Demo එක බලන්න",
    ctaSubtext: "Account එකක් අවශ්‍ය නැහැ. ලැබෙන දේ හරියටම බලන්න.",
    
    // Language toggle
    langToggle: "English",
  },
};

const GetStarted = () => {
  const navigate = useNavigate();
  const { branding, isLoading: brandingLoading } = useBranding();
  const [lang, setLang] = useState<Language>('en');
  const [currentLine, setCurrentLine] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'si')) {
      setLang(savedLang);
    }
  }, []);

  // Toggle language
  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'si' : 'en';
    setLang(newLang);
    localStorage.setItem('preferred_language', newLang);
    setCurrentLine(0);
    setIsTyping(true);
  };

  // Typewriter effect for trauma lines
  useEffect(() => {
    if (currentLine < translations[lang].traumaLines.length) {
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [currentLine, lang]);

  const t = translations[lang];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Language Toggle - Fixed Position */}
      <button
        onClick={toggleLanguage}
        className="fixed top-24 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass-card hover:border-brand/30 transition-all"
      >
        <Languages className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium text-foreground">{t.langToggle}</span>
      </button>

      {/* Hero - The Trauma Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Dark gradient overlay for mood */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-red-950/10 pointer-events-none" />
        
        {/* Subtle red glow for anxiety effect */}
        <div className="absolute top-[30%] left-[20%] w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Main trauma title */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 tracking-tight">
              {t.traumaTitle}
            </h1>

            {/* Typewriter effect lines */}
            <div className="space-y-3 mb-12 min-h-[280px]">
              {t.traumaLines.slice(0, currentLine).map((line, index) => (
                <p 
                  key={index}
                  className={`text-xl md:text-2xl font-light transition-all duration-500 ${
                    index === currentLine - 1 ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  style={{
                    animation: 'fadeInUp 0.5s ease-out',
                  }}
                >
                  {line}
                </p>
              ))}
              {isTyping && (
                <span className="inline-block w-0.5 h-6 bg-brand animate-pulse" />
              )}
            </div>

            {/* Statistic */}
            {!isTyping && (
              <div className="animate-in fade-in duration-700 delay-300">
                <div className="glass-card p-8 inline-block border-red-500/20 bg-red-500/5">
                  <p className="text-lg text-muted-foreground">
                    {t.statText}{' '}
                    <span className="text-red-400 font-semibold">{t.statHighlight}</span>{' '}
                    {t.statEnd}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            {t.painTitle}
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {t.painCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={index}
                  className="glass-card p-6 hover:border-red-500/30 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Positive green/brand glow */}
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-brand/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Intro text */}
            <p className="text-center text-xl text-muted-foreground mb-4">
              {t.solutionIntro}
            </p>

            {/* Brand reveal */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-6">
                {!brandingLoading && branding.logoImage ? (
                  <img src={branding.logoImage} alt={branding.siteName} className="h-16 w-auto" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-brand" />
                  </div>
                )}
                <h2 className="font-display text-4xl md:text-5xl font-bold bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
                  {branding.siteName}
                </h2>
              </div>
              <p className="text-2xl font-medium text-foreground mb-2">
                {t.solutionTagline}
              </p>
              <p className="text-lg text-muted-foreground">
                {t.solutionSubtagline}
              </p>
            </div>

            {/* Benefits card */}
            <div className="glass-card p-8 max-w-2xl mx-auto border-brand/30 bg-gradient-to-br from-brand/5 to-transparent">
              <div className="space-y-4">
                {t.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* AI Tutor highlight */}
              <div className="mt-6 pt-6 border-t border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">24/7 AI Tutor</p>
                  <p className="text-sm text-muted-foreground">
                    Get instant answers to any question, anytime
                  </p>
                </div>
              </div>
            </div>

            {/* Price comparison quote */}
            <p className="text-center text-lg text-muted-foreground mt-8 italic">
              "{t.priceCompare}"
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-secondary/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
              {t.ctaTitle}
            </h2>

            <Button
              size="lg"
              variant="brand"
              onClick={() => navigate('/demo')}
              className="gap-2 px-10 py-6 text-lg"
            >
              {t.ctaButton}
              <ArrowRight className="w-5 h-5" />
            </Button>

            <p className="text-muted-foreground mt-4">
              {t.ctaSubtext}
            </p>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>No signup required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Free to explore</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Real content preview</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
};

export default GetStarted;
