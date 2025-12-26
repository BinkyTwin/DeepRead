"use client";

import { cn } from "@/lib/utils";
import type { Citation } from "@/types/citation";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export function ChatMessage({
  role,
  content,
  citations,
  onCitationClick,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border",
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>

        {citations && citations.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {citations.map((citation, index) => (
                <button
                  key={index}
                  onClick={() => onCitationClick?.(citation)}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  title={citation.quote}
                >
                  Page {citation.page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
