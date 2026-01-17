import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Trash2, Sparkles, X, ArrowUpRight } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import { useAICredits } from "@/hooks/useAICredits";
import { MessageBubble } from "./MessageBubble";
import { CreditBar } from "./CreditBar";
import { QuickActions } from "./QuickActions";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  isFullPage?: boolean;
}

export function ChatWindow({ isOpen, onClose, isFullPage = false }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const { 
    credits, 
    isLoading: creditsLoading, 
    isEligible, 
    isSuspended, 
    strikes,
    remainingCredits 
  } = useAICredits();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = input.trim().length > 0 && 
    !isLoading && 
    isEligible && 
    !isSuspended && 
    remainingCredits > 0;

  if (!isOpen) return null;

  // Ineligible tier - show upgrade prompt
  if (!creditsLoading && !isEligible) {
    return (
      <div className={cn(
        "flex flex-col bg-background border border-border rounded-2xl overflow-hidden shadow-2xl",
        isFullPage ? "h-full w-full" : "fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] h-[70vh] max-h-[500px] z-50"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">NotebaseAI</h3>
              <p className="text-xs text-muted-foreground">Premium Feature</p>
            </div>
          </div>
          {!isFullPage && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Upgrade Prompt */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-brand" />
          </div>
          <h3 className="font-bold text-lg mb-2">Unlock AI Assistant</h3>
          <p className="text-sm text-muted-foreground mb-6">
            NotebaseAI is available exclusively for Gold and Platinum members. 
            Get instant help with your studies, practice questions, and explanations.
          </p>
          <Button onClick={() => navigate("/upgrade")} className="gap-2">
            Upgrade Now <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-background border border-border rounded-2xl overflow-hidden shadow-2xl",
      isFullPage ? "h-full w-full" : "fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] h-[75vh] max-h-[600px] z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">NotebaseAI</h3>
            <p className="text-xs text-muted-foreground">Educational Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearMessages}
              className="h-8 w-8"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!isFullPage && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Credit Bar */}
      {credits && (
        <div className="px-4 py-2 border-b border-border bg-card/50">
          <CreditBar
            used={credits.credits_used}
            limit={credits.credits_limit}
            strikes={strikes}
            isSuspended={isSuspended}
          />
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="font-medium mb-2">How can I help you today?</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Ask me anything about your studies - O/L, A/L subjects, practice problems, or explanations.
              </p>
              <QuickActions 
                onSelect={(template) => setInput(template)} 
                disabled={isSuspended || (!creditsLoading && remainingCredits <= 0)}
              />
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isSuspended 
                ? "Chat suspended..." 
                : !creditsLoading && remainingCredits <= 0 
                  ? "No credits remaining..." 
                  : "Ask anything about your studies..."
            }
            disabled={isSuspended || (!creditsLoading && remainingCredits <= 0)}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend}
            className="h-11 w-11"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          1 word = 1 credit • AI responses are free
        </p>
      </form>
    </div>
  );
}
