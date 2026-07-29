"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function NotebooksError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">Failed to load notebooks</p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
