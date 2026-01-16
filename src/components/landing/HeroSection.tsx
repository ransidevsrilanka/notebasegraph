import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="container mx-auto px-6 relative z-10 py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - subtle, no decoration */}
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-16 font-accent">
            O/L & A/L Preparation
          </p>

          {/* Main Headline - massive, confident */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[7rem] font-black text-foreground tracking-[-0.04em] leading-[0.95] mb-8">
            Everything you need.
            <br />
            <span className="text-muted-foreground">Nothing you don't.</span>
          </h1>

          {/* Subheadline - separated with significant space */}
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-16 leading-relaxed">
            Study materials for students who aim for the top.
          </p>

          {/* Single CTA - understated power */}
          <Link to="/access">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 px-10 text-base font-medium border-border/60 hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-300 group"
            >
              Enter Access Code
              <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
