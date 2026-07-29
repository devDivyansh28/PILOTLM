"use client";

interface TEXTViewerProps {
  content: string;
  highlightRange?: { start: number; end: number };
}

export default function TEXTViewer({ content, highlightRange }: TEXTViewerProps) {
  if (!content) return <div className="p-6 text-muted-foreground">No text content available</div>;

  let rendered = <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{content}</pre>;

  if (highlightRange && highlightRange.start >= 0 && highlightRange.end <= content.length) {
    const before = content.slice(0, highlightRange.start);
    const highlighted = content.slice(highlightRange.start, highlightRange.end);
    const after = content.slice(highlightRange.end);
    rendered = (
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
        {before}<mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{highlighted}</mark>{after}
      </pre>
    );
  }

  return (
    <div className="p-6 overflow-auto h-full">
      {rendered}
    </div>
  );
}
