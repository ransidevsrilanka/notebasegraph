import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";

const About = () => {
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { branding } = useBranding();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('active');
        });
      },
      { threshold: 0.2 }
    );
    sectionsRef.current.forEach((section) => { if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero - Editorial style */}
      <section className="pt-32 md:pt-40 pb-24 md:pb-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark to-background" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-4xl">
          <div 
            ref={(el) => (sectionsRef.current[0] = el)}
            className="reveal"
          >
            <p className="text-muted-foreground/60 uppercase tracking-[0.25em] text-xs mb-8">
              About {branding.siteName}
            </p>
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 tracking-[-0.03em] leading-[0.95]">
              Empowering learners through{' '}
              <span className="text-brand">organized knowledge</span>
            </h1>
            
            <p className="font-body text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              {branding.siteName} was born from a simple belief: that quality educational resources 
              should be organized, accessible, and affordable for students across Sri Lanka.
            </p>
          </div>
        </div>
      </section>

      {/* Mission - Large text block */}
      <section className="py-24 md:py-32 border-t border-border/20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div 
            ref={(el) => (sectionsRef.current[1] = el)}
            className="reveal"
          >
            <p className="text-muted-foreground/60 uppercase tracking-[0.25em] text-xs mb-8">
              Our Mission
            </p>
            
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-8 tracking-[-0.02em]">
              Democratizing access to knowledge
            </h2>
            
            <p className="font-body text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
              We understand the challenges students face in finding quality educational materials. 
              {branding.siteName} bridges this gap by providing a centralized, well-organized library 
              at an affordable cost. No more scattered resources. No more wasted time.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-border/20">
              {[
                { stat: "1000+", label: "Resources" },
                { stat: "5", label: "Streams" },
                { stat: "Weekly", label: "Updates" },
                { stat: "24/7", label: "Access" }
              ].map((item) => (
                <div key={item.label}>
                  <span className="font-display text-3xl md:text-4xl font-bold text-brand block mb-2">
                    {item.stat}
                  </span>
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values - Simple list */}
      <section className="py-24 md:py-32 bg-vault-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div 
            ref={(el) => (sectionsRef.current[2] = el)}
            className="reveal"
          >
            <p className="text-muted-foreground/60 uppercase tracking-[0.25em] text-xs mb-8">
              Our Values
            </p>

            <div className="space-y-12">
              {[
                { title: "Quality Curation", description: "Every resource is carefully selected and organized to ensure maximum learning value." },
                { title: "Accessible Learning", description: "We believe quality education should be affordable and accessible to everyone." },
                { title: "Trust & Security", description: "Your access is protected with secure authentication and reliable service." },
                { title: "Continuous Growth", description: "Regular updates ensure your library stays current and comprehensive." }
              ].map((value, index) => (
                <div 
                  key={value.title} 
                  className="border-b border-border/20 pb-8 last:border-b-0"
                >
                  <h3 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="font-body text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-32 md:py-40">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl">
          <div 
            ref={(el) => (sectionsRef.current[3] = el)}
            className="reveal"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-[-0.02em]">
              Ready to begin?
            </h2>
            <p className="font-body text-muted-foreground text-lg mb-10">
              Access your curriculum today.
            </p>
            <Link to="/pricing">
              <Button variant="brand" size="xl" className="px-10">
                Get Access
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default About;