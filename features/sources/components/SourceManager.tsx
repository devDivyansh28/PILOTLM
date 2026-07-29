"use client";

import React from "react";
import { Upload, RefreshCw, Trash2, MoreHorizontal, FileText, Video, Globe, FileVideo, Presentation, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SourceUploader } from "./SourceUploader";

interface SourceManagerProps {
  notebookId: string;
  sources: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    filePath?: string | null;
    url?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    _count: { chunks: number };
  }>;
}

export function SourceManager({ notebookId, sources }: SourceManagerProps) {
  const [statuses, setStatuses] = React.useState<Record<string, { status: string; error?: string }>>({});
  const [showUploader, setShowUploader] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sources?notebookId=${notebookId}`);
        if (res.ok) {
          const data = await res.json();
          const newStatuses: Record<string, { status: string; error?: string }> = {};
          data.forEach((s: { id: string; status: string; error?: string }) => {
            newStatuses[s.id] = { status: s.status, error: s.error };
          });
          setStatuses(newStatuses);
        }
      } catch (e) {
        console.error("Failed to poll source status:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [notebookId]);

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

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Delete this source? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleReindex = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reindex" }),
      });
      if (res.ok) window.location.reload();
    } catch (e) {
      console.error("Reindex failed:", e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Sources</h2>
        <Button size="sm" onClick={() => setShowUploader(true)}>
          <Upload className="h-4 w-4 mr-2" /> Add Source
        </Button>
        {showUploader && (
          <SourceUploader notebookId={notebookId} onClose={() => { setShowUploader(false); window.location.reload(); }} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sources.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>No sources yet</p>
            <p className="text-sm">Upload a document to get started</p>
          </div>
        )}
        {sources.map((source) => {
          const status = statuses[source.id]?.status || source.status;
          const error = statuses[source.id]?.error;

            return (
              <Card key={source.id} className="transition-shadow hover:shadow-md">
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
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleReindex(source.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Re-index
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(source.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(status)}
                    {status !== "READY" && status !== "FAILED" && (
                      <Progress value={50} className="flex-1 mx-4 max-w-[150px]" />
                    )}
                    {error && (
                      <Badge variant="destructive" className="text-xs">{error}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>
    </div>
  );
}