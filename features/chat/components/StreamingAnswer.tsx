"use client";

import { cn } from "@/lib/utils";

interface StreamingAnswerProps {
  answer: string;
  isStreaming: boolean;
  citations?: Array<{
    sourceId: string;
    type: string;
    location: Record<string, unknown>;
    text: string;
  }>;
}

export function StreamingAnswer({ answer, isStreaming, citations }: StreamingAnswerProps) {
  return (
    <div className="whitespace-pre-wrap">
      {answer}
      {isStreaming && <span className="inline-block w-1 h-4 bg-current animate-pulse ml-0.5" />}
      {citations && citations.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {citations.map((citation, index) => (
            <span key={`${citation.sourceId}-${index}`}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-muted hover:bg-accent cursor-pointer">
                <span className="font-mono">[{index + 1}]</span>
                <span className="truncate max-w-[120px]">{citation.sourceId.slice(0, 8)}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}