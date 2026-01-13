import { useEffect, useRef } from "react";
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

  return (
    <section className="py-24 md:py-32 bg-vault-surface">
      <div className="container mx-auto px-4 sm:px-6">
        {services.map((service, index) => (
          <div 
            key={service.id} 
            ref={(el) => (itemsRef.current[index] = el)}
            className="reveal py-16 md:py-20 border-t border-border/20 first:border-t-0"
            style={{ transitionDelay: `${index * 0.1}s` }}
          >
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-5xl mx-auto">
              <div>
                <span className="text-muted-foreground/50 text-sm uppercase tracking-[0.2em] font-medium">
                  0{index + 1}
                </span>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-6 tracking-[-0.02em]">
                  {service.title}
                </h2>
                <p className="font-body text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg">
                  {service.description}
                </p>
              </div>
              
              {/* Minimal visual - just a large icon */}
              <div className="flex justify-center md:justify-end">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center">
                  <service.icon className="w-12 h-12 md:w-16 md:h-16 text-brand/60" strokeWidth={1.5} />
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