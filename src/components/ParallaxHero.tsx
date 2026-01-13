import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useBranding } from "@/hooks/useBranding";

const ParallaxHero = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { branding } = useBranding();

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-vault-dark">
      {/* Minimal background - just subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-dark" />
      
      {/* Very subtle accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/[0.03] rounded-full blur-[200px] pointer-events-none" />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Massive Headline - Authority */}
          <h1 
            className={`font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[10rem] font-black text-foreground tracking-[-0.04em] leading-[0.85] mb-8 md:mb-10 transition-all duration-1000 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Serious notes.<br />
            <span className="text-brand">Serious results.</span>
          </h1>

          {/* Single line subtext - calm, confident */}
          <p 
            className={`font-body text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 md:mb-16 max-w-xl mx-auto leading-relaxed transition-all duration-1000 delay-200 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Structured study materials for O/L and A/L students who want to win.
          </p>

          {/* Single, prominent CTA */}
          <div 
            className={`transition-all duration-1000 delay-400 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Link to="/access">
              <Button 
                variant="brand" 
                size="xl" 
                className="px-12 h-16 text-base md:text-lg font-semibold gap-3 hover-glow"
              >
                Enter Library
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Scroll indicator - minimal */}
          <div 
            className={`absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer transition-all duration-1000 delay-700 ease-out ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={scrollToFeatures}
          >
            <div className="flex flex-col items-center gap-3 group">
              <span className="text-xs text-muted-foreground/60 uppercase tracking-[0.3em] font-medium">
                Scroll
              </span>
              <div className="w-px h-12 bg-gradient-to-b from-muted-foreground/40 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParallaxHero;