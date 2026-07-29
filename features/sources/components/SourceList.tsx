"use client";

import React from "react";
import { SourceCard } from "./SourceCard";

interface SourceListProps {
  notebookId: string;
}

export function SourceList({ notebookId }: SourceListProps) {
  const [sources, setSources] = React.useState<Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    error: string | null;
    createdAt: string;
    _count: { chunks: number };
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedSource, setSelectedSource] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchSources = async () => {
      try {
        const res = await fetch(`/api/sources?notebookId=${notebookId}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setSources(data);
        }
      } catch (error) {
        console.error("Failed to fetch sources:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSources();
    return () => { mounted = false; };
  }, [notebookId]);

  const refresh = async () => {
    const res = await fetch(`/api/sources?notebookId=${notebookId}`);
    if (res.ok) {
      const data = await res.json();
      setSources(data);
    }
  };

  const handleReindex = async (sourceId: string) => {
    try {
      await fetch(`/api/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reindex" }),
      });
      refresh();
    } catch (error) {
      console.error("Reindex failed:", error);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Delete this source? This cannot be undone.")) return;
    try {
      await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      refresh();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No sources yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              selected={selectedSource === source.id}
              onClick={() => setSelectedSource(source.id)}
              onReindex={() => handleReindex(source.id)}
              onDelete={() => handleDelete(source.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}