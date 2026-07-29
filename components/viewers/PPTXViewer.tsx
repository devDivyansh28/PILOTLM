"use client";

interface PPTXViewerProps {
  content: string;
}

export default function PPTXViewer({ content }: PPTXViewerProps) {
  if (!content) return <div className="p-6 text-muted-foreground">No slide content available</div>;

  const slides = content.split(/(?=Slide \d+)/).filter(Boolean);

  return (
    <div className="p-6 overflow-auto h-full space-y-6">
      {slides.map((slide, i) => (
        <div key={i} className="border rounded-lg p-4 bg-card">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{slide.trim()}</pre>
        </div>
      ))}
    </div>
  );
}
