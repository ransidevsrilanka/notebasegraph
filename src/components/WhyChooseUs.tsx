import { useEffect, useRef, useState } from "react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
    setHoveredIndex(index);
  };

  return (
    <section className="py-32 md:py-40 lg:py-48 bg-background relative overflow-hidden">
      {/* Subtle top border with glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      
      {/* Background mesh gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/[0.03] rounded-full blur-[180px] pointer-events-none" />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 text-center max-w-5xl relative z-10">
        <div ref={sectionRef} className="reveal">
          <p className="text-muted-foreground/50 uppercase tracking-[0.3em] text-xs mb-8">
            The Notebase Difference
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-24 md:mb-32 tracking-[-0.03em]">
            Built for <span className="text-brand">discipline</span>
          </h2>
        </div>

        {/* Stats grid with glass cards and spotlight */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              ref={(el) => (itemsRef.current[index] = el)}
              className="reveal glass-card p-6 md:p-8 relative overflow-hidden group cursor-default"
              style={{ transitionDelay: `${index * 0.1}s` }}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Spotlight effect */}
              <div 
                className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                  hoveredIndex === index ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  background: `radial-gradient(200px circle at ${mousePos.x}% ${mousePos.y}%, hsl(var(--brand) / 0.1), transparent 50%)`
                }}
              />

              <div className="relative z-10 text-center">
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-brand block mb-3 tracking-tight group-hover:scale-105 transition-transform duration-300">
                  {stat.number}
                </span>
                <p className="text-muted-foreground text-sm md:text-base">
                  {stat.label}
                </p>
              </div>

              {/* Subtle inner glow on hover */}
              <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
                hoveredIndex === index ? 'opacity-100' : 'opacity-0'
              }`} style={{
                boxShadow: 'inset 0 0 60px hsl(var(--brand) / 0.05)'
              }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
