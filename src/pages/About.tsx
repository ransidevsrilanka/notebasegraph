import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  BookOpen, 
  Users, 
  Shield, 
  Sparkles, 
  Target, 
  Heart, 
  ArrowRight, 
  Eye,
  FileText,
  Brain,
  Layers,
  Bot,
  Printer,
  Rocket,
  GraduationCap,
  Clock
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";

const values = [
  { icon: Target, title: "Quality First", description: "Every resource is carefully verified and organized by subject experts for maximum learning impact." },
  { icon: Shield, title: "Trust & Security", description: "Your data and access are protected with enterprise-grade security and reliable service." },
  { icon: Users, title: "Accessibility", description: "Affordable pricing ensures quality education is accessible to students from all backgrounds." },
  { icon: Rocket, title: "Innovation", description: "Continuous platform improvements and new features to enhance your learning experience." }
];

const offerings = [
  { icon: FileText, title: "Study Notes", description: "Curated, comprehensive notes for every subject and topic" },
  { icon: BookOpen, title: "Past Papers", description: "Model papers and past papers with marking schemes" },
  { icon: Brain, title: "Quizzes", description: "Interactive quizzes to test your understanding" },
  { icon: Layers, title: "Flashcards", description: "Spaced repetition flashcards for effective memorization" },
  { icon: Bot, title: "AI Tutor", description: "24/7 AI-powered study assistant for instant help" },
  { icon: Printer, title: "Print Service", description: "Get physical copies delivered to your doorstep" },
];

const stats = [
  { value: "1000+", label: "Curated Resources" },
  { value: "5", label: "Subject Streams" },
  { value: "24/7", label: "Access Available" },
  { value: "Weekly", label: "New Content" },
];

const About = () => {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { branding } = useBranding();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('active');
        });
      },
      { threshold: 0.2 }
    );
    cardsRef.current.forEach((card) => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Premium Hero */}
      <section className="pt-28 md:pt-36 pb-20 md:pb-28 relative overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 mb-8 animate-slide-up">
              <Heart className="w-4 h-4 text-brand" />
              <span className="text-brand text-sm font-medium">About {branding.siteName}</span>
            </div>
            
            {/* Main heading */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Empowering Students to{' '}
              <span className="text-brand-gradient">Achieve Excellence</span>
            </h1>
            
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {branding.siteName} is Sri Lanka's premier educational platform, providing 
              curated study materials for O/L and A/L students to excel in their examinations.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {stats.map((stat, index) => (
                <div key={index} className="glass-card-premium p-4 md:p-6 text-center">
                  <div className="font-display text-2xl md:text-3xl font-bold text-brand mb-1">{stat.value}</div>
                  <p className="text-muted-foreground text-xs md:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 md:py-28 bg-vault-surface relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
            {/* Mission */}
            <div className="glass-card-premium p-8 md:p-10 border-glow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center ring-2 ring-brand/30">
                  <Target className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <p className="text-brand text-xs font-medium uppercase tracking-wider">Our Mission</p>
                  <h3 className="font-display text-xl font-bold text-foreground">Democratizing Education</h3>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To democratize quality education by providing accessible, organized study materials 
                that empower every student in Sri Lanka to reach their full academic potential, 
                regardless of their background or location.
              </p>
            </div>

            {/* Vision */}
            <div className="glass-card-premium p-8 md:p-10 border-glow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                  <Eye className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-purple-500 text-xs font-medium uppercase tracking-wider">Our Vision</p>
                  <h3 className="font-display text-xl font-bold text-foreground">Leading Educational Platform</h3>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To become the most trusted educational resource platform in South Asia, 
                known for quality, accessibility, and innovation in digital learning solutions 
                that transform how students prepare for their examinations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-20 md:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 mb-4">
              <GraduationCap className="w-3.5 h-3.5 text-brand" />
              <span className="text-brand text-xs font-medium">Our Platform</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              What We <span className="text-brand-gradient">Offer</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive suite of learning tools designed to help you succeed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {offerings.map((offering, index) => (
              <div 
                key={index} 
                ref={(el) => (cardsRef.current[index] = el)}
                className="reveal glass-card p-6 hover:border-brand/30 transition-all hover-lift group"
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                  <offering.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{offering.title}</h3>
                <p className="text-muted-foreground text-sm">{offering.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-vault-surface relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-1/2 left-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none -translate-x-1/2" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-purple-500 text-xs font-medium">Core Principles</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Our <span className="text-brand-gradient">Values</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div 
                key={index} 
                ref={(el) => (cardsRef.current[offerings.length + index] = el)}
                className="reveal glass-card-premium p-6 md:p-8 hover:border-brand/30 transition-all border-glow"
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand/20 to-brand/10 flex items-center justify-center flex-shrink-0 ring-2 ring-brand/20">
                    <value.icon className="w-7 h-7 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/5 to-transparent" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/10 flex items-center justify-center mx-auto mb-8 ring-2 ring-brand/20">
              <Clock className="w-10 h-10 text-brand" />
            </div>
            
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Ready to Start <span className="text-brand-gradient">Learning</span>?
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of successful students who have discovered the value of organized, accessible educational resources.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/pricing">
                <Button variant="brand" size="lg" className="gap-2 w-full sm:w-auto btn-shimmer">
                  View Plans
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/access">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                  Enter Access Code
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default About;
