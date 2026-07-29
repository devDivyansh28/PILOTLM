"use client";

import React from "react";
import { FileText, Video, Globe, FileVideo, Presentation, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FILE_TYPES = [
  { type: "PDF", accept: ".pdf", icon: FileText, color: "text-red-500" },
  { type: "TEXT", accept: ".txt,.md", icon: File, color: "text-blue-500" },
  { type: "WEBSITE", accept: "url", icon: Globe, color: "text-green-500" },
  { type: "YOUTUBE", accept: "url", icon: Video, color: "text-red-600" },
  { type: "VTT", accept: ".vtt,.srt", icon: FileVideo, color: "text-purple-500" },
  { type: "PPTX", accept: ".pptx", icon: Presentation, color: "text-orange-500" },
];

interface SourceUploaderProps {
  notebookId: string;
  onClose: () => void;
}

export function SourceUploader({ notebookId, onClose }: SourceUploaderProps) {
  const [selectedType, setSelectedType] = React.useState(FILE_TYPES[0]);
  const [file, setFile] = React.useState<File | null>(null);
  const [url, setUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    setError(null);

    if (selectedType.accept === "url") {
      if (!url.trim()) return;
      setUploading(true);
      try {
        const res = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notebookId,
            type: selectedType.type,
            name: url,
            url: url,
          }),
        });
        if (res.ok) {
          onClose();
          window.location.reload();
        } else {
          throw new Error("Upload failed");
        }
      } catch {
        setError("Failed to add URL source");
      } finally {
        setUploading(false);
        setUrl("");
      }
    } else {
      if (!file) return;
      setUploading(true);
      setProgress(0);

      try {
        const uploadRes = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notebookId,
            type: selectedType.type,
            name: file.name,
          }),
        });

        const { sourceId, signature, token, expire, publicKey } = await uploadRes.json();
        if (!uploadRes.ok || !sourceId) throw new Error("Failed to get upload params");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name);
        formData.append("publicKey", publicKey);
        formData.append("signature", signature);
        formData.append("expire", String(expire));
        formData.append("token", token);
        formData.append("useUniqueFileName", "true");

        const ikResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!ikResponse.ok) throw new Error("File upload failed");

        const ikResult = await ikResponse.json();

        const completeRes = await fetch(`/api/sources/${sourceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "completeUpload",
            filePath: ikResult.filePath,
            metadata: { url: ikResult.url, fileId: ikResult.fileId },
          }),
        });

        if (completeRes.ok) {
          setProgress(100);
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 500);
        } else {
          throw new Error("Failed to complete upload");
        }
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        setProgress(0);
        setFile(null);
      }
    }
  };

  return (
    <Dialog defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FILE_TYPES.map((t) => (
              <Button
                key={t.type}
                variant={selectedType.type === t.type ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedType(t);
                  setFile(null);
                  setUrl("");
                  setError(null);
                }}
                className="whitespace-nowrap gap-1"
              >
                <t.icon className={cn("h-3 w-3", t.color)} />
                {t.type}
              </Button>
            ))}
          </div>

          {selectedType.accept === "url" ? (
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={selectedType.type === "WEBSITE" ? "https://example.com" : "https://youtube.com/watch?v=..."}
                disabled={uploading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept={selectedType.accept}
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="truncate">{file.name}</span>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {progress > 0 && progress < 100 && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">Uploading... {Math.round(progress)}%</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || (!file && selectedType.accept !== "url") || (selectedType.accept === "url" && !url.trim())}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Add Source"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}