import { useEffect, useRef } from "react";

const stats = [
  {
    number: "100%",
    label: "Curriculum aligned"
  },
  {
    number: "1:1",
    label: "Access binding"
  },
  {
    number: "24/7",
    label: "Availability"
  },
  {
    number: "O/L & A/L",
    label: "Exam focused"
  }
];

const WhyChooseUs = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    itemsRef.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-32 md:py-40 bg-background relative">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 text-center max-w-5xl">
        <div ref={sectionRef} className="reveal">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-20 md:mb-24 tracking-[-0.03em]">
            Built for <span className="text-brand">discipline</span>
          </h2>
        </div>

        {/* Stats grid - minimal, no animations */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              ref={(el) => (itemsRef.current[index] = el)}
              className="reveal text-left md:text-center"
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <span className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-brand block mb-3 tracking-tight">
                {stat.number}
              </span>
              <p className="text-muted-foreground text-sm md:text-base">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;