import { useRef, useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  grade: string;
  stream?: string;
  avatar?: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Kavindi Perera",
    grade: "A/L 2024",
    stream: "Science",
    quote: "The model papers helped me score 3 A's. The AI tutor explained concepts I struggled with for months in just minutes!",
    rating: 5,
  },
  {
    id: "2",
    name: "Tharushi Fernando",
    grade: "O/L 2025",
    quote: "Best study platform I've used. The notes are so well organized and easy to understand.",
    rating: 5,
  },
  {
    id: "3",
    name: "Dineth Silva",
    grade: "A/L 2024",
    stream: "Maths",
    quote: "Finally passed Combined Maths with a B! The step-by-step solutions made everything click.",
    rating: 5,
  },
  {
    id: "4",
    name: "Nethmi Jayawardena",
    grade: "A/L 2024",
    stream: "Commerce",
    quote: "The flashcards feature is amazing for memorizing accounting concepts. Saved me so much time!",
    rating: 5,
  },
  {
    id: "5",
    name: "Ravindu Wickramasinghe",
    grade: "O/L 2025",
    quote: "I improved my Science grade from C to A in just 3 months. The quizzes really help test your knowledge.",
    rating: 5,
  },
  {
    id: "6",
    name: "Sanduni Dissanayake",
    grade: "A/L 2024",
    stream: "Arts",
    quote: "The Sinhala medium notes are excellent. Finally a platform that caters to us properly!",
    rating: 5,
  },
  {
    id: "7",
    name: "Chamara Bandara",
    grade: "A/L 2024",
    stream: "Technology",
    quote: "ICT and Engineering Tech notes are top-notch. The diagrams are clear and detailed.",
    rating: 5,
  },
  {
    id: "8",
    name: "Ishara Gunasekara",
    grade: "O/L 2025",
    quote: "My parents were skeptical at first but now they recommend it to everyone. Worth every rupee!",
    rating: 5,
  },
];

const TestimonialCard = ({ testimonial, index }: { testimonial: Testimonial; index: number }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 10, y: -x * 10 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex-shrink-0 w-[340px] md:w-[380px] p-6 rounded-2xl bg-glass/30 backdrop-blur-xl border border-glass-border hover:border-brand/30 transition-all duration-500 cursor-default"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? 'all 0.5s ease' : 'none',
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Quote icon */}
      <Quote className="absolute top-4 right-4 w-8 h-8 text-brand/20 group-hover:text-brand/40 transition-colors" />
      
      <div className="relative z-10">
        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 transition-all duration-300 ${
                i < testimonial.rating 
                  ? 'fill-brand text-brand' 
                  : 'fill-muted text-muted'
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        
        {/* Quote */}
        <p className="text-foreground/90 text-sm md:text-base leading-relaxed mb-6 font-body">
          "{testimonial.quote}"
        </p>
        
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-primary-foreground font-semibold text-sm ring-2 ring-brand/20">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
            <p className="text-muted-foreground text-xs">
              {testimonial.grade}
              {testimonial.stream && ` • ${testimonial.stream}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MarqueeRow = ({ items, direction = 'left', speed = 30 }: { items: Testimonial[]; direction?: 'left' | 'right'; speed?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div 
      className="flex overflow-hidden py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        ref={containerRef}
        className="flex gap-6"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {/* Double the items for seamless loop */}
        {[...items, ...items].map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} index={index} />
        ))}
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const firstRow = testimonials.slice(0, 4);
  const secondRow = testimonials.slice(4);

  return (
    <section 
      id="reviews" 
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-dark" />
      
      {/* Accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div 
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-medium tracking-wide uppercase mb-6">
            Student Reviews
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 tracking-tight">
            Loved by <span className="text-brand-gradient">Thousands</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-body">
            Join students across Sri Lanka who've transformed their grades with our platform.
          </p>
        </div>

        {/* Marquee rows */}
        <div 
          className={`transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <MarqueeRow items={firstRow} direction="left" speed={40} />
          <MarqueeRow items={secondRow} direction="right" speed={45} />
        </div>
      </div>

      {/* Side fade gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
    </section>
  );
};

export default TestimonialsSection;
