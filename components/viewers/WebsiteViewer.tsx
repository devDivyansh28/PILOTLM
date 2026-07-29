"use client";

import React from "react";
import { X, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WebsiteViewerProps {
  src: string;
  title: string;
  onClose: () => void;
  citation?: {
    charRange?: [number, number];
  };
}

export function WebsiteViewer({ src, title, onClose }: WebsiteViewerProps) {
  const [fullscreen, setFullscreen] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col bg-background", fullscreen && "fixed")}>
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h2 className="text-lg font-semibold truncate max-w-[300px]">{title}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:underline">
            <span className="flex items-center gap-1">
              Open in new tab <ExternalLink className="h-3 w-3" />
            </span>
          </a>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <iframe
          ref={iframeRef}
          src={src}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={title}
        />
      </div>
    </div>
  );
}