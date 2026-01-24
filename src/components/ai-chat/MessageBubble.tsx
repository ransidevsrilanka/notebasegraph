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
 * Handles multiple formats:
 * 1. Tables entirely on one line with separator included
 * 2. Tables with collapsed rows
 */
function fixMalformedTables(content: string): string {
  const lines = content.split('\n');
  const processedLines: string[] = [];

  for (const line of lines) {
    const pipeCount = (line.match(/\|/g) || []).length;
    
    // Check if this line contains a collapsed table (many pipes + separator pattern)
    if (pipeCount > 6 && /\|[-:\s]+\|/.test(line)) {
      // Try to expand the collapsed table
      // Split by separator pattern |---|---|
      const separatorMatch = line.match(/(\|[-:\s]+(?:\|[-:\s]+)+\|)/);
      if (separatorMatch) {
        const sepIndex = line.indexOf(separatorMatch[0]);
        const headerPart = line.slice(0, sepIndex).trim();
        const separator = separatorMatch[0];
        const bodyPart = line.slice(sepIndex + separator.length).trim();

        // Count columns from separator
        const numCols = (separator.match(/\|/g) || []).length - 1;
        
        if (numCols > 0 && headerPart && bodyPart) {
          // Split body into cells and reconstruct rows
          const bodyCells = bodyPart.split('|').filter((c: string) => c.trim() !== '');
          const rows: string[] = [];
          
          for (let i = 0; i < bodyCells.length; i += numCols) {
            const rowCells = bodyCells.slice(i, i + numCols);
            if (rowCells.length > 0) {
              rows.push('| ' + rowCells.map((c: string) => c.trim()).join(' | ') + ' |');
            }
          }

          processedLines.push(headerPart);
          processedLines.push(separator);
          processedLines.push(...rows);
          continue;
        }
      }
    }
    
    processedLines.push(line);
  }

  return processedLines.join('\n');
}

/**
 * Minimal normalization so common AI delimiters render in KaTeX.
 * - \( ... \) -> $...$
 * - \[ ... \] -> $$...$$
 */
function normalizeLatexDelimiters(input: string): string {
  return input
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  timestamp,
}: MessageBubbleProps) {
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
        "flex gap-3 px-4 py-3 w-full overflow-hidden",
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
          "flex flex-col min-w-0 space-y-1",
          "max-w-[calc(100%-3rem)]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 max-w-full min-w-0 overflow-x-auto overflow-y-hidden",
            isUser
              ? "bg-brand text-brand-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          )}
        >
          {isUser ? (
            // User messages - plain text
            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed [overflow-wrap:anywhere]">
              {content}
            </p>
          ) : (
            // Assistant messages - markdown with LaTeX and code
            <div className="prose prose-invert prose-xs max-w-full min-w-0 text-[13px] leading-relaxed overflow-hidden [overflow-wrap:anywhere]">
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
                  // Tables - contained with horizontal scroll
                  table: ({ children }) => (
                    <div className="overflow-x-auto max-w-full my-3">
                      <table className="border-collapse border border-border text-xs w-max min-w-full">
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
                {fixMalformedTables(normalizeLatexDelimiters(content))}
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
