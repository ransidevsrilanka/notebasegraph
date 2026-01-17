import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

/**
 * Preprocesses AI content to fix malformed LaTeX from AI agents.
 * Uses a "nuclear" approach: strips broken $ placements and re-wraps properly.
 */
function preprocessLatex(content: string): string {
  // Step 0: Normalize troublesome Unicode that breaks KaTeX parsing
  // (apostrophes, non-breaking hyphens, en/em dashes)
  let processed = content
    .replace(/\u2019/g, "'")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-");

  // Step 1: Convert standard LaTeX delimiters first (before stripping)
  
  // Convert \[ ... \] to $$BLOCK...BLOCK$$ (use markers to preserve)
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `%%BLOCK%%${inner}%%ENDBLOCK%%`);
  
  // Convert \( ... \) to %%INLINE%%...%%ENDINLINE%%
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `%%INLINE%%${inner}%%ENDINLINE%%`);
  
  // Step 2: Strip ALL existing $ signs (they're likely misplaced by the AI)
  processed = processed.replace(/\$/g, '');
  
  // Step 3: Find and wrap LaTeX expressions
  // Match sequences that contain LaTeX commands (backslash followed by letters)
  
  // Pattern for complex expressions: \command{...} or \command^... or \command_... etc.
  // This matches things like \frac{a}{b}, \sin\theta, \alpha + \beta, etc.
  const latexExpressionPattern = /(\\[a-zA-Z]+(?:\s*[\^_]\s*(?:\{[^}]*\}|\d|[a-zA-Z]))?(?:\s*\{[^}]*\})*(?:\s*[=+\-±×÷·*/^_]+\s*(?:\\[a-zA-Z]+(?:\s*[\^_]\s*(?:\{[^}]*\}|\d|[a-zA-Z]))?(?:\s*\{[^}]*\})*|[0-9a-zA-Z]+(?:\s*[\^_]\s*(?:\{[^}]*\}|\d|[a-zA-Z]))?)*)*)/g;
  
  processed = processed.replace(latexExpressionPattern, (match) => {
    // Clean up the match
    const trimmed = match.trim();
    if (!trimmed || trimmed.length < 2) return match;
    return `$${trimmed}$`;
  });
  
  // Step 4: Wrap any remaining standalone LaTeX commands
  const standaloneCommands = [
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
    'log', 'ln', 'exp', 'lim', 'sum', 'int', 'prod', 'sqrt', 'frac',
    'theta', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
    'lambda', 'mu', 'nu', 'pi', 'sigma', 'omega', 'phi', 'psi', 'rho', 'tau', 'eta', 'xi',
    'infty', 'pm', 'mp', 'times', 'div', 'cdot', 'leq', 'geq', 'neq', 'approx', 'equiv',
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'to',
    'forall', 'exists', 'partial', 'nabla', 'in', 'notin', 'subset', 'cup', 'cap',
    'qquad', 'quad', 'left', 'right', 'big', 'bigg', 'Big', 'Bigg'
  ];
  
  for (const cmd of standaloneCommands) {
    // Match \command that's not already inside $ and not part of a larger command
    const regex = new RegExp(`(?<!\\$[^$]*)(?<![a-zA-Z])\\\\${cmd}(?:\\s*\\{[^}]*\\})*(?:\\s*\\{[^}]*\\})*(?![^$]*\\$)(?![a-zA-Z])`, 'g');
    processed = processed.replace(regex, (match) => `$${match}$`);
  }
  
  // Step 5: Restore block math markers
  processed = processed.replace(/%%BLOCK%%([\s\S]*?)%%ENDBLOCK%%/g, (_, inner) => `$$${inner}$$`);
  processed = processed.replace(/%%INLINE%%([\s\S]*?)%%ENDINLINE%%/g, (_, inner) => `$${inner}$`);
  
  // Step 6: Clean up - merge adjacent $ $ into single expressions
  // Replace patterns like $\sin$ $\theta$ with $\sin \theta$
  processed = processed.replace(/\$\s*\$\s*/g, ' ');
  
  // Step 7: Fix any remaining issues
  // Remove empty math: $$
  processed = processed.replace(/\$\s*\$/g, '');
  
  // Ensure proper spacing around standalone $...$
  processed = processed.replace(/\$([^$]+)\$/g, (_, inner) => {
    // Don't double-wrap
    if (inner.startsWith('$') || inner.endsWith('$')) {
      return inner;
    }
    return `$${inner.trim()}$`;
  });
  
  return processed;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-brand/20 text-brand"
            : "bg-emerald-500/20 text-emerald-500"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 max-w-[85%] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-brand text-brand-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          )}
        >
          {isUser ? (
            // User messages - plain text
            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{content}</p>
          ) : (
          // Assistant messages - markdown with LaTeX and code
            <div className="prose prose-invert prose-xs max-w-none text-[13px] leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
                components={{
                  // Code blocks with syntax highlighting
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    
                    // Check if it's an inline code or block
                    const isInline = !match && !codeString.includes("\n");
                    
                    if (isInline) {
                      return (
                        <code
                          className="bg-background/50 px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="relative group my-3">
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-background/80 hover:bg-background"
                            onClick={() => copyToClipboard(codeString)}
                          >
                            {copiedCode === codeString ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match?.[1] || "text"}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                  // Lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-0.5 my-1.5 text-[13px]">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-0.5 my-1.5 text-[13px]">
                      {children}
                    </ol>
                  ),
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="my-1.5 first:mt-0 last:mb-0 text-[13px]">{children}</p>
                  ),
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="text-base font-bold mt-3 mb-1.5">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-bold mt-2 mb-1">{children}</h3>
                  ),
                  // Tables
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full border-collapse border border-border">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 bg-muted text-left font-medium">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2">{children}</td>
                  ),
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-brand pl-4 italic my-3">
                      {children}
                    </blockquote>
                  ),
                  // Links
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {preprocessLatex(content)}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-muted-foreground px-2">
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
