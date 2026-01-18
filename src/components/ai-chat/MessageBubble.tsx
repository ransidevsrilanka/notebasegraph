import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState, memo } from "react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

/**
 * Fixes malformed markdown tables that AI outputs on a single line.
 * Converts: | H1 | H2 | |---|---| | C1 | C2 | | C3 | C4 |
 * To proper multi-line format with newlines.
 */
function fixMalformedTables(content: string): string {
  const singleLineTablePattern = /(\|[^|\n]+(?:\|[^|\n]+)+)\s*(\|[-:\s]+(?:\|[-:\s]+)+\|)\s*(\|[^|\n]+(?:\|[^|\n]+)*\|?)/g;
  
  return content.replace(singleLineTablePattern, (match, headerPart, separatorPart, bodyPart) => {
    const header = headerPart.trim();
    const separator = separatorPart.trim();
    
    const headerCols = (header.match(/\|/g) || []).length - 1;
    if (headerCols <= 0) return match;
    
    const bodyCells = bodyPart.split('|').filter((cell: string) => cell.trim() !== '');
    const rows: string[] = [];
    
    for (let i = 0; i < bodyCells.length; i += headerCols) {
      const rowCells = bodyCells.slice(i, i + headerCols);
      if (rowCells.length > 0) {
        rows.push('| ' + rowCells.map((c: string) => c.trim()).join(' | ') + ' |');
      }
    }
    
    return `${header}\n${separator}\n${rows.join('\n')}`;
  });
}

export const MessageBubble = memo(function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
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
          "max-w-[85%] min-w-0 space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 overflow-hidden break-words",
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
                rehypePlugins={[[rehypeKatex, { 
                  throwOnError: false, 
                  strict: "ignore",
                  trust: false,
                  macros: {}
                }]]}
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
                {fixMalformedTables(content)}
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
});
