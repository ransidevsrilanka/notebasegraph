import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const ClosingPush = () => {
  return (
    <section className="py-32 md:py-48 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Powerful closing statement */}
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-foreground tracking-[-0.04em] leading-[1.1] mb-16">
            While others scroll,
            <br />
            <span className="text-muted-foreground">you study.</span>
          </h2>

          {/* Single CTA */}
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

export default ClosingPush;
