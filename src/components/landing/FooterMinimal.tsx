import { Link } from "react-router-dom";
import { useBranding } from "@/hooks/useBranding";

const FooterMinimal = () => {
  const currentYear = new Date().getFullYear();
  const { branding, isLoading } = useBranding();

  return (
    <footer className="py-12 bg-background border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-display font-bold text-foreground">
              {!isLoading && branding.siteName}
            </span>
            <span>·</span>
            <span>© {currentYear}</span>
          </div>

          {/* Essential Links */}
          <div className="flex items-center gap-8 text-sm">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterMinimal;
