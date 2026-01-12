import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LockedContentProps {
  title?: string;
  description?: string;
  className?: string;
}

const LockedContent = ({ 
  title = "Premium Content", 
  description = "Sign up to unlock this content",
  className = ""
}: LockedContentProps) => {
  const navigate = useNavigate();

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Blurred background placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted backdrop-blur-xl" />
      
      {/* Lock overlay */}
      <div className="relative flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-brand" />
        </div>
        <h3 className="font-semibold text-foreground text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">{description}</p>
        <Button 
          variant="brand" 
          onClick={() => navigate('/paid-signup')}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Sign Up to Unlock
        </Button>
      </div>
    </div>
  );
};

export default LockedContent;
