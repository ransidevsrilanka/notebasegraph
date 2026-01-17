import { ChatWindow } from "@/components/ai-chat";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AIChat() {
  const navigate = useNavigate();

  return (
<div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">NotebaseAI</h1>
            <p className="text-xs text-muted-foreground">Your Educational AI Assistant</p>
          </div>
        </div>
      </header>

      {/* Chat Window - Full Page Mode */}
      <div className="flex-1 max-w-4xl mx-auto w-full min-h-0">
        <ChatWindow isOpen={true} onClose={() => navigate(-1)} isFullPage={true} />
      </div>
    </div>
  );
}
