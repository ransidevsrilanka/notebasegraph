import { useRef, useEffect, useState } from "react";
import { Star, Quote, Award, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeacherTestimonial {
  id: string;
  name: string;
  title: string | null;
  photo_url: string | null;
  message: string;
  sort_order: number;
}

interface StudentTestimonial {
  id: string;
  name: string;
  grade: string;
  stream: string | null;
  year: string;
  message: string;
  rating: number;
  sort_order: number;
}

// Fallback data
const fallbackTeachers: TeacherTestimonial[] = [
  { id: "1", name: "Dr. Kamal Perera", title: "Senior Physics Lecturer", photo_url: null, message: "Notebase provides exceptional study materials that align perfectly with the national curriculum. I recommend it to all my students.", sort_order: 1 },
  { id: "2", name: "Mrs. Shalini Fernando", title: "Mathematics Teacher", photo_url: null, message: "The quality of model papers and structured notes is outstanding. A must-have resource for serious students.", sort_order: 2 },
  { id: "3", name: "Mr. Ranjan Silva", title: "Chemistry Tutor", photo_url: null, message: "I've seen remarkable improvement in my students who use Notebase regularly. The content is comprehensive and well-organized.", sort_order: 3 },
  { id: "4", name: "Dr. Nimal Jayawardena", title: "Biology Professor", photo_url: null, message: "As an educator, I appreciate the accuracy and depth of the materials. Highly recommended for A/L Science students.", sort_order: 4 },
];

const fallbackStudents: StudentTestimonial[] = [
  { id: "1", name: "Kavindi Perera", grade: "A/L", stream: "Science", year: "2024", message: "The model papers helped me score 3 A's. The AI tutor explained concepts I struggled with for months in just minutes!", rating: 5, sort_order: 1 },
  { id: "2", name: "Tharushi Fernando", grade: "O/L", stream: null, year: "2025", message: "Best study platform I've used. The notes are so well organized and easy to understand.", rating: 5, sort_order: 2 },
  { id: "3", name: "Dineth Silva", grade: "A/L", stream: "Maths", year: "2024", message: "Finally passed Combined Maths with a B! The step-by-step solutions made everything click.", rating: 5, sort_order: 3 },
  { id: "4", name: "Nethmi Jayawardena", grade: "A/L", stream: "Commerce", year: "2024", message: "The flashcards feature is amazing for memorizing accounting concepts. Saved me so much time!", rating: 5, sort_order: 4 },
  { id: "5", name: "Ravindu Wickramasinghe", grade: "O/L", stream: null, year: "2025", message: "I improved my Science grade from C to A in just 3 months. The quizzes really help test your knowledge.", rating: 5, sort_order: 5 },
  { id: "6", name: "Sanduni Dissanayake", grade: "A/L", stream: "Arts", year: "2024", message: "The Sinhala medium notes are excellent. Finally a platform that caters to us properly!", rating: 5, sort_order: 6 },
];

// Teacher Card Component
const TeacherTestimonialCard = ({ testimonial }: { testimonial: TeacherTestimonial }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 8, y: -x * 8 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex-shrink-0 w-[320px] md:w-[380px] p-6 rounded-2xl bg-glass/30 backdrop-blur-xl border border-glass-border hover:border-emerald-500/30 transition-all duration-500 cursor-default"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? 'all 0.5s ease' : 'none',
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Quote icon */}
      <Quote className="absolute top-4 right-4 w-8 h-8 text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors" />
      
      <div className="relative z-10">
        {/* Recommended Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Recommended</span>
          </div>
        </div>
        
        {/* Quote */}
        <p className="text-foreground/90 text-sm md:text-base leading-relaxed mb-6 font-body line-clamp-4">
          "{testimonial.message}"
        </p>
        
        {/* Author with larger photo */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20">
            {testimonial.photo_url ? (
              <img src={testimonial.photo_url} alt={testimonial.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              testimonial.name.charAt(0)
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
            <p className="text-muted-foreground text-xs">{testimonial.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Student Card Component
const StudentTestimonialCard = ({ testimonial }: { testimonial: StudentTestimonial }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 8, y: -x * 8 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex-shrink-0 w-[320px] md:w-[380px] p-6 rounded-2xl bg-glass/30 backdrop-blur-xl border border-glass-border hover:border-amber-500/30 transition-all duration-500 cursor-default"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? 'all 0.5s ease' : 'none',
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Quote icon */}
      <Quote className="absolute top-4 right-4 w-8 h-8 text-amber-500/20 group-hover:text-amber-500/40 transition-colors" />
      
      <div className="relative z-10">
        {/* Gold Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 transition-all duration-300 ${
                i < testimonial.rating 
                  ? 'fill-amber-400 text-amber-400' 
                  : 'fill-muted text-muted'
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        
        {/* Quote */}
        <p className="text-foreground/90 text-sm md:text-base leading-relaxed mb-6 font-body line-clamp-4">
          "{testimonial.message}"
        </p>
        
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-amber-400/30">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              {testimonial.grade}
              {testimonial.stream && ` • ${testimonial.stream}`}
              {` • ${testimonial.year}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Marquee Row Component
const MarqueeRow = ({ 
  children, 
  direction = 'left', 
  speed = 30 
}: { 
  children: React.ReactNode; 
  direction?: 'left' | 'right'; 
  speed?: number;
}) => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div 
      className="flex overflow-hidden py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className="flex gap-6"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fetch teacher testimonials
  const { data: teachers = fallbackTeachers } = useQuery({
    queryKey: ['teacher-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_testimonials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TeacherTestimonial[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch student testimonials
  const { data: students = fallbackStudents } = useQuery({
    queryKey: ['student-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_testimonials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as StudentTestimonial[];
    },
    staleTime: 5 * 60 * 1000,
  });

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

  // Double items for seamless loop
  const teacherItems = [...teachers, ...teachers];
  const studentItems = [...students, ...students];

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
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 tracking-tight">
            Trusted by <span className="text-brand-gradient">Thousands</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-body">
            See what educators and students across Sri Lanka say about us.
          </p>
        </div>

        {/* Teacher Recommendations Row */}
        <div className={`mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Award className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              Recommended by Top Educators
            </span>
          </div>
          <MarqueeRow direction="left" speed={45}>
            {teacherItems.map((t, i) => (
              <TeacherTestimonialCard key={`${t.id}-${i}`} testimonial={t} />
            ))}
          </MarqueeRow>
        </div>

        {/* Student Reviews Row */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Student Reviews
            </span>
          </div>
          <MarqueeRow direction="right" speed={40}>
            {studentItems.map((s, i) => (
              <StudentTestimonialCard key={`${s.id}-${i}`} testimonial={s} />
            ))}
          </MarqueeRow>
        </div>
      </div>

      {/* Side fade gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
    </section>
  );
};

export default TestimonialsSection;