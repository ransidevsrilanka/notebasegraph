import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useBranding } from "@/hooks/useBranding";

const ParallaxHero = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { branding } = useBranding();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger animation after mount - slower for premium feel
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Magnetic button effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    buttonRef.current.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  };

  const handleMouseLeave = () => {
    if (!buttonRef.current) return;
    buttonRef.current.style.transform = 'translate(0, 0)';
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-vault-dark mesh-gradient">
      {/* Deep gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-dark" />
      
      {/* Subtle mesh gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand/[0.03] rounded-full blur-[150px] pointer-events-none animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand/[0.02] rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '-4s' }} />
      
      {/* Very subtle accent glow at center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-brand/[0.04] rounded-full blur-[200px] pointer-events-none" />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          {/* Massive Headline - Authority - with clip-path reveal */}
          <div className="overflow-hidden mb-8 md:mb-10">
            <h1 
              className={`font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-black text-foreground tracking-[-0.04em] leading-[0.85] transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              Serious notes.<br />
              <span className="text-brand">Serious results.</span>
            </h1>
          </div>

          {/* Single line subtext - calm, confident */}
          <p 
            className={`font-body text-lg md:text-xl lg:text-2xl text-muted-foreground mb-14 md:mb-20 max-w-xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Structured study materials for O/L and A/L students who want to win.
          </p>

          {/* Single, prominent CTA with magnetic effect */}
          <div 
            className={`transition-all duration-1000 delay-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div 
              ref={buttonRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="inline-block transition-transform duration-200 ease-out"
            >
              <Link to="/access">
                <Button 
                  variant="brand" 
                  size="xl" 
                  className="px-14 h-16 text-base md:text-lg font-semibold gap-3 hover-glow magnetic-btn group"
                >
                  Enter Library
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Scroll indicator - minimal, premium */}
          <div 
            className={`absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer transition-all duration-1000 delay-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={scrollToFeatures}
          >
            <div className="flex flex-col items-center gap-4 group">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.4em] font-medium">
                Scroll
              </span>
              <div className="w-px h-16 bg-gradient-to-b from-muted-foreground/30 to-transparent group-hover:from-brand/50 transition-colors duration-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParallaxHero;
