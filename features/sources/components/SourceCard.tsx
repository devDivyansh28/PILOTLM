"use client";

import { FileText, Video, Globe, FileVideo, Presentation, File, MoreHorizontal, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  source: {
    id: string;
    name: string;
    type: string;
    status: string;
    error: string | null;
    createdAt: string;
    _count: { chunks: number };
  };
  selected: boolean;
  onClick: () => void;
  onReindex: () => void;
  onDelete: () => void;
}

export function SourceCard({ source, selected, onClick, onReindex, onDelete }: SourceCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PDF": return <FileText className="h-4 w-4 text-red-500" />;
      case "TEXT": return <File className="h-4 w-4 text-blue-500" />;
      case "WEBSITE": return <Globe className="h-4 w-4 text-green-500" />;
      case "YOUTUBE": return <Video className="h-4 w-4 text-red-600" />;
      case "VTT": return <FileVideo className="h-4 w-4 text-purple-500" />;
      case "PPTX": return <Presentation className="h-4 w-4 text-orange-500" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "outline",
      UPLOADING: "default",
      EXTRACTING: "default",
      CHUNKING: "default",
      EMBEDDING: "default",
      STORING: "default",
      INDEXING: "default",
      READY: "default",
      FAILED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"} className="capitalize">{status.toLowerCase()}</Badge>;
  };

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer",
        selected ? "ring-2 ring-primary" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-accent">{getTypeIcon(source.type)}</div>
            <div className="min-w-0">
              <p className="font-medium truncate">{source.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{source.type}</span>
                <span>•</span>
                <span>{source._count.chunks} chunks</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReindex(); }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Re-index
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          {getStatusBadge(source.status)}
          {source.status !== "READY" && source.status !== "FAILED" && (
            <Progress value={50} className="flex-1 mx-4 max-w-[150px]" />
          )}
          {source.error && (
            <Badge variant="destructive" className="text-xs">{source.error}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}