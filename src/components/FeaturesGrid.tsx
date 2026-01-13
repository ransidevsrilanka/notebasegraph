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

  return (
    <section 
      ref={sectionRef} 
      id="features" 
      className="py-32 md:py-40 lg:py-48 bg-background relative"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {/* Simple header */}
        <p className="text-muted-foreground/60 uppercase tracking-[0.25em] text-xs mb-20 reveal" ref={(el) => (itemsRef.current[0] = el)}>
          Why Notebase
        </p>

        {/* Large text statements - not cards */}
        <div className="space-y-20 md:space-y-24">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              ref={(el) => (itemsRef.current[index + 1] = el)}
              className="reveal"
              style={{ transitionDelay: `${(index + 1) * 0.15}s` }}
            >
              <h3 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 tracking-[-0.03em]">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;