import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { ChatWindow } from "./ChatWindow";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  className?: string;
}

export function ChatButton({ className }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, enrollment } = useAuth();

  // Only show for logged-in users with enrollment
  if (!user || !enrollment) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-brand hover:bg-brand-light transition-all duration-300",
          isOpen && "rotate-90",
          className
        )}
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Sparkles className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Chat Window */}
      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
