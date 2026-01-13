import { useEffect, useRef } from "react";

const features = [
  {
    title: "Structured notes",
    description: "Every topic organized chapter by chapter. No random files, no confusion."
  },
  {
    title: "Exam-focused content",
    description: "Materials designed specifically for Sri Lankan national examinations."
  },
  {
    title: "Sinhala & English",
    description: "Study in your preferred medium. Both languages supported."
  }
];

const FeaturesGrid = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    itemsRef.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  // Section glow effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !glowRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = 1 - (rect.top / window.innerHeight);
      if (progress > 0.2 && progress < 1.2) {
        glowRef.current.style.opacity = `${Math.min(progress * 0.3, 0.3)}`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section 
      ref={sectionRef} 
      id="features" 
      className="py-32 md:py-40 lg:py-48 bg-background relative section-glow"
    >
      {/* Subtle glow at top */}
      <div 
        ref={glowRef}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/[0.04] rounded-full blur-[120px] pointer-events-none opacity-0 transition-opacity duration-1000"
      />

      {/* Horizontal line accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        {/* Simple header */}
        <p 
          ref={(el) => (itemsRef.current[0] = el)}
          className="text-muted-foreground/50 uppercase tracking-[0.3em] text-xs mb-24 reveal"
        >
          Why Notebase
        </p>

        {/* Large text statements - not cards */}
        <div className="space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              ref={(el) => (itemsRef.current[index + 1] = el)}
              className="reveal group"
              style={{ transitionDelay: `${(index + 1) * 0.15}s` }}
            >
              {/* Subtle number */}
              <span className="text-muted-foreground/20 text-sm font-mono mb-4 block">
                0{index + 1}
              </span>
              <h3 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 md:mb-8 tracking-[-0.03em] group-hover:text-brand transition-colors duration-500">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
                {feature.description}
              </p>
              {/* Subtle divider */}
              {index < features.length - 1 && (
                <div className="mt-24 md:mt-32 h-px bg-gradient-to-r from-border/30 via-border/10 to-transparent max-w-lg" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
