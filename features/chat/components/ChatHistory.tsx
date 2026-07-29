"use client";

import React from "react";
import { MessageSquare, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatSummary {
  id: string;
  title: string | null;
  updatedAt: string;
  _count: { messages: number };
}

interface ChatHistoryProps {
  notebookId: string;
  activeChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatHistory({ notebookId, activeChatId, onSelectChat, onNewChat }: ChatHistoryProps) {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/chats`);
        if (res.ok && mounted) {
          setChats(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch chats:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [notebookId]);

  const handleRename = async (chatId: string) => {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title: editTitle.trim() } : c));
        setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm("Delete this chat?")) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChatId === chatId) onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">Chats</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewChat} title="New chat">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {loading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse bg-muted rounded" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No chats yet</p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
                chat.id === activeChatId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              {editingId === chat.id ? (
                <div className="flex-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(chat.id)}
                    className="h-6 text-xs px-1"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRename(chat.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 truncate">{chat.title || "Untitled"}</span>
                  <span className="text-[10px] opacity-50">{chat._count.messages}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); setEditingId(chat.id); setEditTitle(chat.title || ""); }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(chat.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
