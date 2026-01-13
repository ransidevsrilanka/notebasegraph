import { useEffect, useRef, useState } from "react";
import { BookOpen, Shield, Zap } from "lucide-react";

const services = [
  {
    id: 1,
    icon: BookOpen,
    title: "Comprehensive Library",
    description: "Access hundreds of curated study notes, past papers, and revision materials. Everything organized by subject, topic, and difficulty level for efficient learning."
  },
  {
    id: 2,
    icon: Shield,
    title: "Secure Access",
    description: "One-time activation binds to your account. Your investment is protected with device tracking and secure authentication. No sharing, no leaks."
  },
  {
    id: 3,
    icon: Zap,
    title: "Instant Updates",
    description: "New content added regularly. When exam patterns change, your library updates. Stay ahead with the latest materials and revision techniques."
  }
];

const StickyServices = () => {
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.3 }
    );

    itemsRef.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  // Handle spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
    setHoveredCard(index);
  };

  return (
    <section className="py-28 md:py-36 bg-vault-surface relative overflow-hidden">
      {/* Subtle background mesh */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand/[0.02] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-brand/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20 md:mb-28">
          <p className="text-muted-foreground/50 uppercase tracking-[0.3em] text-xs mb-6">
            What You Get
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-[-0.03em]">
            Everything you need
          </h2>
        </div>

        {services.map((service, index) => (
          <div 
            key={service.id} 
            ref={(el) => (itemsRef.current[index] = el)}
            className="reveal py-12 md:py-16 border-t border-border/10 first:border-t-0 last:border-b last:border-border/10"
            style={{ transitionDelay: `${index * 0.12}s` }}
          >
            <div 
              className="glass-card p-8 md:p-12 relative overflow-hidden group cursor-default"
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                '--spotlight-x': `${mousePosition.x}%`,
                '--spotlight-y': `${mousePosition.y}%`,
              } as React.CSSProperties}
            >
              {/* Spotlight effect */}
              <div 
                className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                  hoveredCard === index ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  background: `radial-gradient(400px circle at ${mousePosition.x}% ${mousePosition.y}%, hsl(var(--brand) / 0.08), transparent 40%)`
                }}
              />

              <div className="grid md:grid-cols-[auto_1fr_auto] gap-8 md:gap-12 items-center relative z-10">
                {/* Number */}
                <span className="text-muted-foreground/30 text-6xl md:text-7xl font-display font-bold hidden md:block">
                  0{index + 1}
                </span>

                {/* Content */}
                <div>
                  <span className="text-muted-foreground/50 text-sm uppercase tracking-[0.2em] font-medium md:hidden mb-4 block">
                    0{index + 1}
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em] group-hover:text-brand transition-colors duration-500">
                    {service.title}
                  </h2>
                  <p className="font-body text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
                    {service.description}
                  </p>
                </div>
                
                {/* Icon - minimal, refined */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-brand/[0.05] border border-brand/10 flex items-center justify-center group-hover:bg-brand/[0.08] group-hover:border-brand/20 transition-all duration-500">
                  <service.icon className="w-10 h-10 md:w-12 md:h-12 text-brand/50 group-hover:text-brand/70 transition-colors duration-500" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StickyServices;
