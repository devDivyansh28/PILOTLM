"use client";

import React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SourceManager } from "@/features/sources/components/SourceManager";
import { ChatInterface } from "@/features/chat/components/ChatInterface";
import { ChatHistory } from "@/features/chat/components/ChatHistory";

interface NotebookDetailProps {
  notebook: {
    id: string;
    title: string;
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
    chats: Array<{
      id: string;
      title: string | null;
      updatedAt: string;
      _count: { messages: number };
    }>;
  };
}

export function NotebookDetail({ notebook }: NotebookDetailProps) {
  const [activeChatId, setActiveChatId] = React.useState<string | undefined>();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-xl font-semibold">{notebook.title}</h1>
        <span className="text-sm text-muted-foreground">
          {notebook.sources.length} sources • {notebook.chats.length} chats
        </span>
      </div>

      <Group orientation="horizontal" className="flex-1 min-h-0">
        {/* Sources Panel */}
        <Panel minSize={280} maxSize={500} defaultSize={320}>
          <div className="h-full border-r flex flex-col">
            <SourceManager notebookId={notebook.id} sources={notebook.sources} />
          </div>
        </Panel>

        <Separator className="bg-border" />

        {/* Chat History Panel */}
        <Panel minSize={160} maxSize={260} defaultSize={200}>
          <div className="h-full border-r flex flex-col">
            <ChatHistory
              notebookId={notebook.id}
              activeChatId={activeChatId}
              onSelectChat={setActiveChatId}
              onNewChat={() => setActiveChatId(undefined)}
            />
          </div>
        </Panel>

        <Separator className="bg-border/50" />

        {/* Chat Panel */}
        <Panel minSize={400} defaultSize={600}>
          <div className="h-full flex flex-col">
            <ChatInterface
              notebookId={notebook.id}
              chatId={activeChatId}
              onChatChange={setActiveChatId}
            />
          </div>
        </Panel>
      </Group>
    </div>
  );
}