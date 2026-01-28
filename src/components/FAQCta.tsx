import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowRight } from "lucide-react";

const FAQCta = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-brand" />
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Have Questions?
          </h3>
          <p className="text-muted-foreground mb-6">
            Find answers to common questions about Notebase, pricing, content access, and more.
          </p>
          <Link to="/faq">
            <Button variant="brand" size="lg" className="gap-2 btn-shimmer">
              View FAQ
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FAQCta;
