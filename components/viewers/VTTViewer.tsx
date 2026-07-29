"use client";

interface VTTViewerProps {
  content: string;
}

function parseSegments(content: string): { start: number; end: number; text: string }[] {
  const lines = content.split("\n");
  const segments: { start: number; end: number; text: string }[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let currentText: string[] = [];

  const timeRegex = /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/;
  const toMs = (h: string, m: string, s: string, ms: string) =>
    (parseInt(h || "0") * 3600 + parseInt(m) * 60 + parseInt(s)) * 1000 + parseInt(ms);

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(timeRegex);
    if (match) {
      if (currentText.length > 0) {
        segments.push({ start: currentStart, end: currentEnd, text: currentText.join(" ") });
        currentText = [];
      }
      currentStart = toMs(match[1] || "0", match[2], match[3], match[4]);
      currentEnd = toMs(match[5] || "0", match[6], match[7], match[8]);
    } else if (trimmed && !trimmed.startsWith("WEBVTT") && !trimmed.startsWith("NOTE") && !/^\d+$/.test(trimmed)) {
      currentText.push(trimmed.replace(/<[^>]+>/g, ""));
    }
  }
  if (currentText.length > 0) {
    segments.push({ start: currentStart, end: currentEnd, text: currentText.join(" ") });
  }
  return segments;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VTTViewer({ content }: VTTViewerProps) {
  if (!content) return <div className="p-6 text-muted-foreground">No transcript available</div>;

  const segments = parseSegments(content);

  return (
    <div className="p-6 overflow-auto h-full space-y-3">
      {segments.map((seg, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <span className="text-muted-foreground font-mono shrink-0 w-12">{formatTime(seg.start)}</span>
          <span>{seg.text}</span>
        </div>
      ))}
    </div>
  );
}
