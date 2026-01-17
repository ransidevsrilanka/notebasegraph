import { BookOpen, HelpCircle, FileText, Calculator, Lightbulb, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onSelect: (template: string) => void;
  disabled?: boolean;
}

const QUICK_ACTIONS = [
  { 
    icon: BookOpen, 
    label: "Explain Topic", 
    template: "Explain the concept of [topic] in simple terms with examples" 
  },
  { 
    icon: HelpCircle, 
    label: "Practice Questions", 
    template: "Give me 5 practice questions on [topic] with answers" 
  },
  { 
    icon: FileText, 
    label: "Summarize", 
    template: "Summarize the key points of [topic] for exam revision" 
  },
  { 
    icon: Calculator, 
    label: "Solve Problem", 
    template: "Solve this problem step by step: [problem]" 
  },
  { 
    icon: Lightbulb, 
    label: "Study Tips", 
    template: "What are the best study strategies for [subject]?" 
  },
  { 
    icon: FlaskConical, 
    label: "Past Papers", 
    template: "What are common past paper questions on [topic]?" 
  },
];

export function QuickActions({ onSelect, disabled }: QuickActionsProps) {
  return (
    <div className="w-full">
      <p className="text-xs text-muted-foreground mb-3">Quick actions:</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(action.template)}
            className={cn(
              "h-8 px-3 text-xs gap-1.5",
              "hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30",
              "transition-colors"
            )}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
