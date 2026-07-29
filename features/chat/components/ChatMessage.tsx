"use client";

import { format } from "date-fns";
import { CitationChip } from "./CitationChip";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    citations: Array<{
      sourceId: string;
      type: string;
      location: Record<string, unknown>;
      text: string;
    }>;
  };
  onCitationClick?: (citation: ChatMessageProps["message"]["citations"][0]) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div className={cn("flex-1 min-w-0", isUser ? "text-right" : "text-left")}>
        <div className={cn(
          "inline-block max-w-[85%] px-4 py-2 rounded-2xl",
          isUser ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5" style={{ direction: isUser ? "rtl" : "ltr" }}>
            {message.citations.map((citation, index) => (
              <span key={`${citation.sourceId}-${index}`} onClick={() => onCitationClick?.(citation)}>
                <CitationChip citation={citation} index={index} onClick={() => onCitationClick?.(citation)} />
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{format(new Date(message.createdAt), "HH:mm")}</p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}