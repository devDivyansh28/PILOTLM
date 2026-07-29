"use client";

import React from "react";
import ReactPlayer from "react-player";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface YouTubeViewerProps {
  src: string;
  title: string;
  onClose: () => void;
  citation?: {
    timestamp?: number;
  };
}

export function YouTubeViewer({ src, title, onClose, citation }: YouTubeViewerProps) {
  const [fullscreen] = React.useState(false);

  React.useEffect(() => {
    if (citation?.timestamp) {
      // ReactPlayer will handle seeking via the ref
    }
  }, [citation]);

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col bg-background", fullscreen && "fixed")}>
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h2 className="text-lg font-semibold truncate max-w-[300px]">{title}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <ReactPlayer
          src={src}
          width="100%"
          height="100%"
          controls={true}
        />
      </div>
    </div>
  );
}