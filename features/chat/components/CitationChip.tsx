"use client";

import { FileText, Video, Globe, FileVideo, Presentation, File, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CitationChipProps {
  citation: {
    sourceId: string;
    type: string;
    location: Record<string, unknown>;
    text: string;
  };
  index: number;
  onClick: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  PDF: <FileText className="h-3 w-3 text-red-500" />,
  YOUTUBE: <Video className="h-3 w-3 text-red-600" />,
  WEBSITE: <Globe className="h-3 w-3 text-green-500" />,
  VTT: <FileVideo className="h-3 w-3 text-purple-500" />,
  PPTX: <Presentation className="h-3 w-3 text-orange-500" />,
  TEXT: <FileText className="h-3 w-3 text-blue-500" />,
  default: <File className="h-3 w-3" />,
};

export function CitationChip({ citation, index, onClick }: CitationChipProps) {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer gap-1 px-2 py-1 hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <span className="font-mono text-xs">[{index + 1}]</span>
      {typeIcons[citation.type] || typeIcons.default}
      <span className="text-xs truncate max-w-[150px]">{citation.sourceId.slice(0, 8)}</span>
      <ExternalLink className="h-3 w-3 opacity-50" />
    </Badge>
  );
}