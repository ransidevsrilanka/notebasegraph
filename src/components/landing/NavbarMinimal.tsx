import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

const NavbarMinimal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { branding, isLoading } = useBranding();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-background border-b border-border/30' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - minimal */}
          <Link to="/" className="font-display text-lg font-bold text-foreground tracking-tight">
            {!isLoading && branding.siteName}
          </Link>

          {/* Desktop CTAs - minimal */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-medium h-10 px-4">
                Sign In
              </Button>
            </Link>
            <Link to="/access">
              <Button 
                variant="outline" 
                size="sm" 
                className="font-medium h-10 px-6 border-border/60 hover:bg-foreground hover:text-background hover:border-foreground transition-all"
              >
                Enter Code
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="py-6 space-y-4 border-t border-border/30">
            <Link 
              to="/auth" 
              onClick={() => setIsOpen(false)}
              className="block text-muted-foreground hover:text-foreground text-sm font-medium py-2"
            >
              Sign In
            </Link>
            <Link to="/access" onClick={() => setIsOpen(false)}>
              <Button 
                variant="outline" 
                className="w-full h-12 border-border/60 hover:bg-foreground hover:text-background"
              >
                Enter Access Code
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarMinimal;
