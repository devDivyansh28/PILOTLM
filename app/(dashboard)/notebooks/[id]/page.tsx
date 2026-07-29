"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceUploader } from "@/features/sources/components/SourceUploader";
import { SourceList } from "@/features/sources/components/SourceList";
import { ChatInterface } from "@/features/chat/components/ChatInterface";
import { ChatHistory } from "@/features/chat/components/ChatHistory";

export default function NotebookDetailPage() {
  const params = useParams();
  const notebookId = params.id as string;
  const [showSourceUploader, setShowSourceUploader] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | undefined>();

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Sources</h2>
            <p className="text-sm text-muted-foreground">Manage your sources</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSourceUploader(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SourceList notebookId={notebookId} />
        </div>
      </div>

      <div className="w-56 border-r bg-muted/20 flex flex-col shrink-0">
        <ChatHistory
          notebookId={notebookId}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={() => setActiveChatId(undefined)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface notebookId={notebookId} chatId={activeChatId} onChatChange={setActiveChatId} />
      </div>

      {showSourceUploader && (
        <SourceUploader onClose={() => setShowSourceUploader(false)} notebookId={notebookId} />
      )}
    </div>
  );
}
