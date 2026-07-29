"use client";

import React from "react";
import { PDFViewer } from "./PDFViewer";
import { YouTubeViewer } from "./YouTubeViewer";
import { WebsiteViewer } from "./WebsiteViewer";
import TEXTViewer from "./TEXTViewer";
import VTTViewer from "./VTTViewer";
import PPTXViewer from "./PPTXViewer";
import { Loader2, AlertCircle } from "lucide-react";

interface CitationData {
  sourceId: string;
  type: string;
  location: Record<string, unknown>;
  text: string;
}

interface SourceViewerModalProps {
  citation: CitationData;
  onClose: () => void;
}

interface SourceData {
  id: string;
  type: string;
  name: string;
  url?: string | null;
  filePath?: string | null;
  chunks?: { content?: string; charRange?: { start: number; end: number } }[];
}

export function SourceViewerModal({ citation, onClose }: SourceViewerModalProps) {
  const [source, setSource] = React.useState<SourceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchSource = async () => {
      try {
        const res = await fetch(`/api/sources/${citation.sourceId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setSource(data);
        } else {
          if (mounted) setError("Source not found");
        }
      } catch {
        if (mounted) setError("Failed to load source");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSource();
    return () => { mounted = false; };
  }, [citation.sourceId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>{error || "Source unavailable"}</p>
          <button onClick={onClose} className="text-sm underline hover:text-foreground">Close</button>
        </div>
      </div>
    );
  }

  const src = source.url || source.filePath || "";
  const title = source.name;
  const content = source.chunks?.[0]?.content;
  const charRange = citation.location.charRange as { start: number; end: number } | undefined;

  switch (source.type) {
    case "PDF":
      return <PDFViewer src={src} title={title} onClose={onClose} citation={{ page: citation.location.page as number, bbox: citation.location.bbox as [number, number, number, number] }} />;
    case "YOUTUBE":
      return <YouTubeViewer src={src} title={title} onClose={onClose} citation={{ timestamp: citation.location.timestamp as number }} />;
    case "WEBSITE":
      return <WebsiteViewer src={src} title={title} onClose={onClose} citation={{ charRange: citation.location.charRange as [number, number] }} />;
    case "TEXT":
      return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <TEXTViewer content={content || citation.text} highlightRange={charRange} />
        </div>
      );
    case "VTT":
      return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <VTTViewer content={content || citation.text} />
        </div>
      );
    case "PPTX":
      return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <PPTXViewer content={content || citation.text} />
        </div>
      );
    default:
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p>Preview not available for {source.type} sources</p>
            <button onClick={onClose} className="text-sm underline hover:text-foreground">Close</button>
          </div>
        </div>
      );
  }
}
