import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAICredits } from "./useAICredits";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  credits: {
    used: number;
    limit: number;
    remaining: number;
    wordsCost: number;
  };
  strikes: number;
}

interface ChatError {
  error: string;
  code?: string;
  strikes?: number;
  remainingWarnings?: number;
  required?: number;
  remaining?: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { refetch: refetchCredits, isEligible, isSuspended, remainingCredits } = useAICredits();

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim()) return false;
    
    if (!isEligible) {
      toast.error("AI Assistant is only available for Gold and Platinum members");
      return false;
    }

    if (isSuspended) {
      toast.error("Your AI access is suspended for this month");
      return false;
    }

    // Quick check for credits (rough estimate)
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > remainingCredits) {
      toast.error(`Insufficient credits. Your message needs ${wordCount} credits but you have ${remainingCredits} remaining.`);
      return false;
    }

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Prepare conversation history (exclude current message)
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: content.trim(),
            conversationHistory,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ChatError;
        
        // Handle specific error codes
        if (errorData.code === "SUSPENDED") {
          toast.error("Your AI access has been suspended for this month");
        } else if (errorData.code === "ABUSE_WARNING") {
          toast.warning(errorData.error);
        } else if (errorData.code === "INSUFFICIENT_CREDITS") {
          toast.error(`Insufficient credits. Need ${errorData.required}, have ${errorData.remaining}`);
        } else if (errorData.code === "TIER_INELIGIBLE") {
          toast.error("Upgrade to Gold or Platinum to use AI Assistant");
        } else {
          toast.error(errorData.error || "Failed to send message");
        }
        
        // Remove the user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        setIsLoading(false);
        refetchCredits();
        return false;
      }

      const successData = data as ChatResponse;

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: successData.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Refresh credits
      refetchCredits();
      
      setIsLoading(false);
      return true;

    } catch (error) {
      console.error("AI Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setIsLoading(false);
      return false;
    }
  }, [messages, isEligible, isSuspended, remainingCredits, refetchCredits]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
