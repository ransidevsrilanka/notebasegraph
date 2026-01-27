import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useBranding } from "@/hooks/useBranding";

// Word-by-word reveal component
const AnimatedHeading = ({ text }: { text: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Split text and identify "base" for special styling
  const words = text.split(' ');
  
  return (
    <h1 ref={ref} className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-6 md:mb-8 text-foreground tracking-[-0.04em] leading-[0.9]">
      {words.map((word, index) => {
        const isBase = /base/i.test(word);
        return (
          <span
            key={index}
            className={`inline-block ${isBase ? 'text-brand-gradient gradient-animate' : ''}`}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0) blur(0)' : 'translateY(20px)',
              filter: isVisible ? 'blur(0px)' : 'blur(8px)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
            }}
          >
            {word}
            {index < words.length - 1 && '\u00A0'}
          </span>
        );
      })}
    </h1>
  );
};

const ParallaxHero = () => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { branding } = useBranding();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background Layers */}
      <div 
        className="absolute inset-0 bg-vault-dark"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      />
      <div 
        className="absolute inset-0 hero-gradient"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      />
      
      {/* Animated grid pattern with parallax + mouse movement */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollY * 0.2}px) translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`
        }}
      />
      
      {/* Floating orbs with parallax + mouse influence */}
      <div 
        className="absolute top-1/4 left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-brand/8 rounded-full blur-[120px] md:blur-[150px] animate-float"
        style={{ 
          transform: `translate(${scrollY * 0.1 + mousePosition.x * 20}px, ${scrollY * 0.15 + mousePosition.y * 20}px)` 
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-brand/5 rounded-full blur-[100px] md:blur-[120px]"
        style={{ 
          transform: `translate(-${scrollY * 0.08 + mousePosition.x * 15}px, ${scrollY * 0.1 - mousePosition.y * 15}px)`,
          animationDelay: '2s' 
        }}
      />
      
      {/* Third orb for extra depth */}
      <div 
        className="absolute top-1/2 right-1/3 w-[250px] h-[250px] bg-brand/4 rounded-full blur-[100px]"
        style={{ 
          transform: `translate(${mousePosition.x * -25}px, ${mousePosition.y * -25}px)` 
        }}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-20 pb-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Heading with word-by-word reveal */}
          <div 
            style={{ 
              transform: `translateY(${scrollY * 0.1}px) translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)` 
            }}
          >
            <AnimatedHeading text={branding.heading} />
          </div>

          {/* Subheading with fade-in */}
          <p 
            className="font-body text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 md:mb-12 max-w-2xl mx-auto text-balance leading-relaxed px-4 animate-text-reveal"
            style={{ animationDelay: '0.5s' }}
          >
            {branding.tagline}
          </p>

          {/* CTA Buttons with enhanced effects */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-16 md:mb-20 px-4 animate-text-reveal" 
            style={{ animationDelay: '0.7s' }}
          >
            <Link to="/access" className="w-full sm:w-auto">
              <Button 
                variant="brand" 
                size="lg" 
                className="gap-3 px-8 md:px-10 h-12 md:h-14 text-sm md:text-base font-semibold w-full sm:w-auto btn-shimmer btn-ripple hover-glow transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Key className="w-4 md:w-5 h-4 md:h-5" />
                Enter Access Code
              </Button>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 px-8 md:px-10 h-12 md:h-14 text-sm md:text-base font-medium border-border/50 hover:bg-glass hover:border-brand/30 w-full sm:w-auto transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
              >
                View Plans
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Scroll indicator with enhanced animation */}
          <div 
            className="flex flex-col items-center gap-3 cursor-pointer group animate-text-reveal" 
            onClick={scrollToFeatures}
            style={{ animationDelay: '0.9s' }}
          >
            <span className="font-accent text-xs text-muted-foreground uppercase tracking-[0.2em] group-hover:text-foreground transition-colors">
              Discover More
            </span>
            <div className="w-8 h-12 rounded-full border border-border/50 flex items-start justify-center p-2 group-hover:border-brand/50 transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--brand)/0.2)]">
              <ChevronDown className="w-4 h-4 text-muted-foreground animate-bounce group-hover:text-brand transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParallaxHero;
