import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState, memo, useRef, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

/**
 * Normalize common AI LaTeX delimiters to standard $ / $$ so remark-math picks them up.
 */
function normalizeLatex(input: string): string {
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
  const contentRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isUser = role === "user";

  // Enforce max-width on any child that might have escaped containment
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const maxW = el.clientWidth;
    el.querySelectorAll<HTMLElement>("*").forEach((child) => {
      if (child.scrollWidth > maxW) {
        child.style.maxWidth = "100%";
        child.style.overflowX = "auto";
      }
    });
  }, [content]);

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 w-full",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-brand/20 text-brand" : "bg-emerald-500/20 text-emerald-500"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content Wrapper */}
      <div
        className={cn(
          "flex flex-col min-w-0 max-w-[calc(100%-3rem)] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Bubble */}
        <div
          ref={contentRef}
          className={cn(
            "rounded-2xl px-4 py-3 max-w-full min-w-0 overflow-hidden break-words",
            isUser
              ? "bg-brand text-brand-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          )}
          style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
              {content}
            </p>
          ) : (
            <div className="chat-prose prose prose-invert prose-xs max-w-full min-w-0 text-[13px] leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[
                  [
                    rehypeKatex,
                    { throwOnError: false, strict: "ignore", trust: false, macros: {} },
                  ],
                ]}
                components={{
                  // Code blocks
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
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
                      <div className="relative group my-3 max-w-full overflow-x-auto">
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                            maxWidth: "100%",
                            overflowX: "auto",
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
                  // Tables - horizontal scroll wrapper
                  table: ({ children }) => (
                    <div className="overflow-x-auto max-w-full my-3">
                      <table className="border-collapse border border-border text-xs min-w-max">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 bg-muted/50 text-left font-medium whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2 whitespace-nowrap">
                      {children}
                    </td>
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
                {normalizeLatex(content)}
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
