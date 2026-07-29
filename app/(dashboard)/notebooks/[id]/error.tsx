"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function NotebookDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">Failed to load notebook</p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
